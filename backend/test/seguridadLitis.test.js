// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const llm = require('../src/config/llm');
const logsService = require('../src/services/logs.service');
const asistenteService = require('../src/services/asistente.service');
const busquedaService = require('../src/services/busqueda.service');
const documentosService = require('../src/services/documentos.service');
const enlacesDescarga = require('../src/services/enlacesDescarga.service');
const accesoRepository = require('../src/repositories/acceso.repository');
const busquedaRepository = require('../src/repositories/busqueda.repository');
const herramientasLitis = require('../src/asistente/herramientas');
const { crearLimite, autenticacionLitis } = require('../src/asistente/seguridad');
const { describirConsulta } = require('../src/asistente/auditoria');

const token = (usuario) => jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: '1h' });

// levanta un servidor en un puerto libre y devuelve su url base
async function levantar(app) {
    const servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));
    return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

function post(url, body, tokenSesion) {
    const headers = { 'Content-Type': 'application/json' };
    if (tokenSesion) headers.Authorization = `Bearer ${tokenSesion}`;
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

function simularIA(...respuestas) {
    let vez = 0;
    mock.method(llm, 'estaDisponible', () => true);
    mock.method(llm, 'enviar', async () => respuestas[Math.min(vez++, respuestas.length - 1)]);
}

let log;
let servidor;
let base;

beforeEach(async () => {
    log = mock.method(logsService, 'registrarEvento', async () => {});
    // por defecto el documento es de un expediente del usuario; los casos sin acceso lo cambian
    mock.method(accesoRepository, 'puedeVerExpediente', async () => true);
    ({ servidor, base } = await levantar(require('../src/app')));
});

afterEach(async () => {
    mock.restoreAll();
    await new Promise((resolve) => servidor.close(resolve));
});

describe('HU40 - autenticación con el formato del contrato', () => {
    test('sin sesión, los mensajes responden NO_AUTENTICADO', async () => {
        const respuesta = await post(`${base}/api/asistente/mensajes`, { mensaje: 'hola' });

        assert.equal(respuesta.status, 401);
        assert.deepEqual(await respuesta.json(), { codigo: 'NO_AUTENTICADO', mensaje: 'Tenés que iniciar sesión para usar Litis.' });
    });

    test('con un token inválido también responde NO_AUTENTICADO', async () => {
        const respuesta = await post(`${base}/api/asistente/mensajes`, { mensaje: 'hola' }, 'token-falso');
        assert.equal((await respuesta.json()).codigo, 'NO_AUTENTICADO');
    });

    test('pedir un enlace de descarga sin sesión responde NO_AUTENTICADO', async () => {
        const respuesta = await post(`${base}/api/asistente/documentos/911/enlace`, { modo: 'ver' });

        assert.equal(respuesta.status, 401);
        assert.equal((await respuesta.json()).codigo, 'NO_AUTENTICADO');
    });

    test('con sesión deja pasar y carga el usuario', async () => {
        const app = express();
        app.get('/x', autenticacionLitis, (req, res) => res.json({ id: req.usuario.id }));
        const prueba = await levantar(app);

        const respuesta = await fetch(`${prueba.base}/x`, { headers: { Authorization: `Bearer ${token({ id: 42 })}` } });

        assert.deepEqual(await respuesta.json(), { id: 42 });
        await new Promise((resolve) => prueba.servidor.close(resolve));
    });
});

describe('HU40 - límite de consultas', () => {
    // app chica con un limite de 2 por minuto para no hacer 11 pedidos
    async function appConLimite() {
        const app = express();
        app.get('/x', autenticacionLitis, crearLimite(2), (req, res) => res.json({ ok: true }));
        return levantar(app);
    }

    const pedir = (url, idUsuario) => fetch(url, { headers: { Authorization: `Bearer ${token({ id: idUsuario })}` } });

    test('al superar el límite responde 429 LIMITE_CONSULTAS', async () => {
        const prueba = await appConLimite();

        assert.equal((await pedir(`${prueba.base}/x`, 1)).status, 200);
        assert.equal((await pedir(`${prueba.base}/x`, 1)).status, 200);
        const tercera = await pedir(`${prueba.base}/x`, 1);

        assert.equal(tercera.status, 429);
        assert.deepEqual(await tercera.json(), {
            codigo: 'LIMITE_CONSULTAS',
            mensaje: 'Hiciste muchas consultas seguidas. Esperá un minuto y volvé a intentar.',
        });
        await new Promise((resolve) => prueba.servidor.close(resolve));
    });

    test('el límite es por usuario, no compartido', async () => {
        const prueba = await appConLimite();

        await pedir(`${prueba.base}/x`, 1);
        await pedir(`${prueba.base}/x`, 1);
        assert.equal((await pedir(`${prueba.base}/x`, 1)).status, 429);
        assert.equal((await pedir(`${prueba.base}/x`, 2)).status, 200);
        await new Promise((resolve) => prueba.servidor.close(resolve));
    });

    test('la ruta real de mensajes tiene límite (10 por minuto por defecto)', async () => {
        simularIA({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] });
        const sesion = token({ id: 9001 });

        const estados = [];
        for (let i = 0; i < 11; i++) {
            estados.push((await post(`${base}/api/asistente/mensajes`, { mensaje: 'hola' }, sesion)).status);
        }

        assert.deepEqual(estados.slice(0, 10), Array(10).fill(200));
        assert.equal(estados[10], 429);
    });
});

describe('HU40 - auditoría en el log de seguridad', () => {
    test('cada consulta queda registrada con mensaje, herramientas y resultados', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [{
            id: 911, nombreArchivo: 'demanda.pdf', tipoDocumento: 'Demanda', fecha: new Date(),
            expedienteId: 128, numeroExpediente: 'EXP-2025-128', caratula: 'Pérez c/ ACME',
        }]);
        simularIA(
            { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'buscar_documentos', input: { cliente: 'Pérez' } }] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Encontré la demanda.' }] },
        );

        const respuesta = await post(`${base}/api/asistente/mensajes`, { mensaje: 'traeme la demanda de Pérez' }, token({ id: 7 }));
        const cuerpo = await respuesta.json();

        const [req, evento] = log.mock.calls[0].arguments;
        assert.equal(req.usuario.id, 7);
        assert.equal(evento.accion, 'Consulta');
        assert.equal(evento.modulo, 'Asistente');
        assert.equal(evento.resultado, 'OK');
        assert.match(evento.descripcion, /"traeme la demanda de Pérez"/);
        assert.match(evento.descripcion, /Herramientas: buscar_documentos/);
        assert.match(evento.descripcion, /Resultados: documento 911/);
        // la lista de herramientas es solo para el log: no se envia al front
        assert.deepEqual(Object.keys(cuerpo).sort(), ['respuesta', 'resultados']);
    });

    test('una consulta con error también queda registrada', async () => {
        const respuesta = await post(`${base}/api/asistente/mensajes`, { mensaje: 'hola' }, token({ id: 7 }));

        assert.equal(respuesta.status, 503);
        const [, evento] = log.mock.calls[0].arguments;
        assert.equal(evento.resultado, 'Error');
        assert.match(evento.descripcion, /Error: ASISTENTE_NO_DISPONIBLE/);
    });

    test('la descripción recorta mensajes largos e indica el expediente de contexto', () => {
        const descripcion = describirConsulta({ mensaje: 'x'.repeat(1000), contexto: 'EXP-2026-26' });

        assert.match(descripcion, /desde EXP-2026-26/);
        assert.ok(descripcion.length < 500);
        assert.match(descripcion, /Herramientas: ninguna\. Resultados: ninguno/);
    });

    test('las descargas desde Litis quedan registradas con el usuario del enlace', async () => {
        mock.method(documentosService, 'obtenerUrlDescargaDocumento', async () => ({
            documento: { id: 911, nombre_archivo: 'demanda.pdf', activo: true },
            url: 'https://cloudinary.test/demanda',
        }));
        const fetchReal = globalThis.fetch;
        mock.method(globalThis, 'fetch', async (url, opciones) => (
            String(url).startsWith('https://cloudinary.test') ? new Response('%PDF') : fetchReal(url, opciones)
        ));
        const enlace = enlacesDescarga.generarToken(911, 7);

        const respuesta = await fetchReal(`${base}/api/asistente/documentos/descargar?t=${encodeURIComponent(enlace)}&modo=ver`);

        assert.equal(respuesta.status, 200);
        const [req, evento] = log.mock.calls[0].arguments;
        assert.equal(req.usuario.id, 7);
        assert.equal(evento.accion, 'Descarga');
        assert.equal(evento.modulo, 'Documentos');
        assert.match(evento.descripcion, /Descarga desde Litis \(ver\): demanda\.pdf \(documento 911\)/);
    });
});

describe('Litis solo accede a los expedientes del usuario', () => {
    const DOCUMENTO_AJENO = {
        documento: { id: 950, nombre_archivo: 'ajeno.pdf', activo: true, expediente: 300 },
        url: 'https://cloudinary.test/ajeno',
    };

    test('no da enlaces de documentos de expedientes ajenos (y no revela que existen)', async () => {
        mock.method(documentosService, 'obtenerUrlDescargaDocumento', async () => DOCUMENTO_AJENO);
        const acceso = mock.method(accesoRepository, 'puedeVerExpediente', async () => false);

        const respuesta = await post(`${base}/api/asistente/documentos/950/enlace`, { modo: 'ver' }, token({ id: 7, nombre: 'Ana' }));

        assert.equal(respuesta.status, 404);
        assert.deepEqual(await respuesta.json(), { codigo: 'NO_ENCONTRADO', mensaje: 'No encontré el documento.' });
        assert.deepEqual(acceso.mock.calls[0].arguments, [7, 300]);
    });

    test('un enlace ya emitido deja de servir si el expediente ya no es del usuario', async () => {
        mock.method(documentosService, 'obtenerUrlDescargaDocumento', async () => DOCUMENTO_AJENO);
        mock.method(accesoRepository, 'puedeVerExpediente', async () => false);
        const enlace = enlacesDescarga.generarToken(950, 7);

        const respuesta = await fetch(`${base}/api/asistente/documentos/descargar?t=${encodeURIComponent(enlace)}&modo=ver`);

        assert.equal(respuesta.status, 404);
        assert.equal(log.mock.callCount(), 0);
    });

    test('todas las búsquedas de las herramientas filtran por el usuario de la sesión', async () => {
        const consultas = ['buscarExpedientes', 'buscarDocumentos', 'buscarClientes', 'buscarTareas', 'buscarNovedades']
            .map((nombre) => mock.method(busquedaRepository, nombre, async () => []));
        const ctx = { usuario: { id: 7 }, expedienteId: 26 };
        const usar = (nombre, input) => herramientasLitis.porNombre[nombre].ejecutar(input, ctx);

        await usar('buscar_expedientes', { texto: 'x' });
        await usar('buscar_documentos', { texto: 'x' });
        await usar('buscar_clientes', { texto: 'x' });
        await usar('listar_tareas', {});
        await usar('listar_novedades', {});

        for (const consulta of consultas) {
            assert.equal(consulta.mock.calls[0].arguments[0].usuarioId, 7);
        }
    });

    test('sin usuario en la sesión las herramientas no buscan nada', async () => {
        const consulta = mock.method(busquedaRepository, 'buscarExpedientes', async () => []);
        for (const nombre of ['buscar_expedientes', 'buscar_documentos', 'buscar_clientes', 'listar_tareas', 'listar_novedades']) {
            await assert.rejects(herramientasLitis.porNombre[nombre].ejecutar({ texto: 'x' }, {}), { codigo: 'NO_AUTENTICADO' }, nombre);
        }
        assert.equal(consulta.mock.callCount(), 0);
    });
});

describe('HU40 - las herramientas trabajan con el usuario logueado', () => {
    test('cada herramienta recibe el usuario de la sesión en su contexto', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => []);
        const herramientas = require('../src/asistente/herramientas');
        const ejecutar = mock.method(herramientas.porNombre.buscar_expedientes, 'ejecutar');
        simularIA(
            { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'buscar_expedientes', input: { texto: 'x' } }] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] },
        );

        await asistenteService.conversar({ mensaje: 'buscá x', historial: [] }, { id: 7, nombre: 'Ana' });

        assert.equal(buscar.mock.callCount(), 1);
        assert.deepEqual(ejecutar.mock.calls[0].arguments[1].usuario, { id: 7, nombre: 'Ana' });
    });
});
