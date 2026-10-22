// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const llm = require('../src/config/llm');
const asistenteService = require('../src/services/asistente.service');
const busquedaService = require('../src/services/busqueda.service');
const expedientesRepository = require('../src/repositories/expedientes.repository');
const accesoRepository = require('../src/repositories/acceso.repository');
const asistenteRepository = require('../src/repositories/asistente.repository');
const cloudinaryDocumento = require('../src/services/cloudinaryDocumento.service');
const herramientas = require('../src/asistente/herramientas');
const leerDocumento = require('../src/asistente/herramientas/leerDocumento');
const { pedidoLitisSchema } = require('../src/asistente/asistente.schemas');
const logsService = require('../src/services/logs.service');

const USUARIO = { id: 7, nombre: 'Ana', apellido: 'Gómez' };

const EXPEDIENTE = {
    id: 26,
    caratula: 'Pérez c/ ACME s/ daños',
    fecha_creacion: new Date('2026-03-10T12:00:00Z'),
    clienteNombre: 'Juan Pérez ',
};

// respuestas simuladas de la IA
function respuestaTexto(texto) {
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: texto }] };
}

function respuestaHerramienta(name, input = {}, id = 'toolu_1') {
    return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id, name, input }] };
}

// simula la IA devolviendo las respuestas en orden; guarda los pedidos recibidos
function simularIA(...respuestas) {
    const pedidos = [];
    mock.method(llm, 'estaDisponible', () => true);
    mock.method(llm, 'enviar', async (pedido) => {
        // copia: el ciclo sigue agregando mensajes al mismo array
        pedidos.push({ ...pedido, messages: [...pedido.messages] });
        return respuestas[Math.min(pedidos.length - 1, respuestas.length - 1)];
    });
    return pedidos;
}

beforeEach(() => {
    // por defecto el expediente es del usuario; los casos sin acceso lo cambian
    mock.method(accesoRepository, 'puedeVerExpediente', async () => true);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LITIS_MAX_ITERACIONES;
    delete process.env.LITIS_LECTURA_MAX_MB;
});

afterEach(() => mock.restoreAll());

describe('HU32 - cliente de IA configurable', () => {
    test('sin clave no está disponible y responde ASISTENTE_NO_DISPONIBLE', async () => {
        assert.equal(llm.estaDisponible(), false);
        await assert.rejects(
            llm.enviar({ system: [], messages: [] }),
            { statusCode: 503, codigo: 'ASISTENTE_NO_DISPONIBLE', message: 'Litis no está disponible en este momento.' }
        );
    });

    test('el modelo y los tokens salen de las variables de entorno', () => {
        process.env.LITIS_MODELO = 'claude-sonnet-5-5';
        process.env.LITIS_MAX_TOKENS = '2000';
        try {
            assert.deepEqual(
                { modelo: llm.configuracion().modelo, maxTokens: llm.configuracion().maxTokens },
                { modelo: 'claude-sonnet-5-5', maxTokens: 2000 }
            );
        } finally {
            delete process.env.LITIS_MODELO;
            delete process.env.LITIS_MAX_TOKENS;
        }
    });

    test('el timeout sale de LITIS_TIMEOUT_SEGUNDOS y por defecto es 120', () => {
        assert.equal(llm.configuracion().timeoutSegundos, 120);
        process.env.LITIS_TIMEOUT_SEGUNDOS = '45';
        try {
            assert.equal(llm.configuracion().timeoutSegundos, 45);
        } finally {
            delete process.env.LITIS_TIMEOUT_SEGUNDOS;
        }
    });

    test('caída, timeout, clave inválida o límite del proveedor se informan como no disponible', () => {
        for (const status of [undefined, 401, 403, 429, 500, 529]) {
            assert.equal(llm.esFallaDelProveedor(status), true, `status ${status}`);
        }
    });

    test('un pedido rechazado por configuración o código (400, 404) no se disfraza de caída', () => {
        for (const status of [400, 404, 413, 422]) {
            assert.equal(llm.esFallaDelProveedor(status), false, `status ${status}`);
        }
    });

    test('sin clave, conversar corta antes de llamar a la IA', async () => {
        const enviar = mock.method(llm, 'enviar');
        await assert.rejects(asistenteService.conversar({ mensaje: 'hola', historial: [] }, USUARIO), { statusCode: 503 });
        assert.equal(enviar.mock.callCount(), 0);
    });
});

describe('HU33 - ciclo con herramientas', () => {
    test('recorre el ciclo completo con una herramienta y devuelve texto y resultados', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => [{
            id: 26, numeroInterno: 'EXP-2026-26', caratula: 'Pérez c/ ACME s/ daños', estado: 'En trámite', tipo: 'Civil', cliente: 'Juan Pérez',
        }]);
        const pedidos = simularIA(
            respuestaHerramienta('buscar_expedientes', { cliente: 'Pérez' }),
            respuestaTexto('Encontré el expediente de Juan Pérez contra ACME.'),
        );

        const resultado = await asistenteService.conversar({ mensaje: 'expedientes de Pérez', historial: [] }, USUARIO);

        assert.equal(resultado.respuesta, 'Encontré el expediente de Juan Pérez contra ACME.');
        assert.deepEqual(resultado.resultados, [{
            tipo: 'expediente',
            id: 26,
            titulo: 'Pérez c/ ACME s/ daños',
            subtitulo: 'EXP-2026-26 · En trámite · Juan Pérez',
            expedienteId: 26,
            numeroExpediente: 'EXP-2026-26',
        }]);
        assert.equal(buscar.mock.calls[0].arguments[0].cliente, 'Pérez');

        // la segunda vuelta le devuelve a la IA el resumen de la herramienta
        const toolResult = pedidos[1].messages.at(-1).content[0];
        assert.equal(toolResult.type, 'tool_result');
        assert.equal(toolResult.tool_use_id, 'toolu_1');
        assert.match(toolResult.content[0].text, /EXP-2026-26/);
        assert.ok(pedidos[0].tools.some((t) => t.name === 'buscar_expedientes'));
    });

    test('se corta al llegar al máximo de iteraciones (configurable)', async () => {
        process.env.LITIS_MAX_ITERACIONES = '3';
        mock.method(busquedaService, 'buscarExpedientes', async () => []);
        const pedidos = simularIA(respuestaHerramienta('buscar_expedientes', { texto: 'x' }));

        const resultado = await asistenteService.conversar({ mensaje: 'buscá', historial: [] }, USUARIO);

        assert.equal(pedidos.length, 3);
        assert.equal(resultado.respuesta, asistenteService.MENSAJE_LIMITE_ITERACIONES);
        assert.deepEqual(resultado.resultados, []);
    });

    test('una herramienta desconocida o que falla vuelve como error a la IA, sin cortar el pedido', async () => {
        mock.method(busquedaService, 'buscarExpedientes', async () => { throw new Error('timeout de la base'); });
        const pedidos = simularIA(
            {
                stop_reason: 'tool_use',
                content: [
                    { type: 'tool_use', id: 'a', name: 'no_existe', input: {} },
                    { type: 'tool_use', id: 'b', name: 'buscar_expedientes', input: { texto: 'x' } },
                ],
            },
            respuestaTexto('No pude buscar.'),
        );
        mock.method(console, 'error', () => {});

        const resultado = await asistenteService.conversar({ mensaje: 'buscá', historial: [] }, USUARIO);

        // los dos resultados vuelven juntos en un solo mensaje
        const [desconocida, fallida] = pedidos[1].messages.at(-1).content;
        assert.deepEqual([desconocida.is_error, desconocida.content], [true, 'Herramienta desconocida.']);
        assert.deepEqual([fallida.is_error, fallida.content], [true, 'No se pudo completar la consulta.']);
        assert.equal(resultado.respuesta, 'No pude buscar.');
    });

    test('convierte el historial del front, descarta el saludo inicial y limita la cantidad', () => {
        const historial = [
            { autor: 'litis', texto: '¡Hola! Soy Litis' },
            ...Array.from({ length: 4 }, (_, i) => ({ autor: i % 2 ? 'litis' : 'usuario', texto: `m${i}` })),
        ];
        assert.deepEqual(asistenteService.convertirHistorial(historial), [
            { role: 'user', content: 'm0' },
            { role: 'assistant', content: 'm1' },
            { role: 'user', content: 'm2' },
            { role: 'assistant', content: 'm3' },
        ]);
    });

    test('el mensaje actual va al final y las instrucciones incluyen usuario y reglas', async () => {
        const pedidos = simularIA(respuestaTexto('¡Hola Ana!'));
        await asistenteService.conversar({
            mensaje: '¿quién sos?',
            historial: [{ autor: 'usuario', texto: 'hola' }, { autor: 'litis', texto: '¡Hola!' }],
        }, USUARIO);

        assert.deepEqual(pedidos[0].messages.at(-1), { role: 'user', content: '¿quién sos?' });
        const instrucciones = pedidos[0].system.map((b) => b.text).join('\n');
        assert.match(instrucciones, /Ana Gómez/);
        assert.match(instrucciones, /rioplatense/);
        assert.match(instrucciones, /asesoramiento jurídico/);
    });

    test('un rechazo de la IA se informa con un mensaje claro', async () => {
        simularIA({ stop_reason: 'refusal', content: [] });
        const resultado = await asistenteService.conversar({ mensaje: 'x', historial: [] }, USUARIO);
        assert.equal(resultado.respuesta, 'No puedo ayudarte con ese pedido.');
    });

    test('el registro permite sumar herramientas sin tocar el ciclo', () => {
        assert.deepEqual(Object.keys(herramientas.definiciones[0]).sort(), ['description', 'input_schema', 'name']);
        for (const definicion of herramientas.definiciones) {
            assert.equal(typeof herramientas.porNombre[definicion.name].ejecutar, 'function');
        }
    });

    test('valida el pedido con el schema del contrato', () => {
        assert.equal(pedidoLitisSchema.safeParse({ mensaje: '   ' }).success, false);
        assert.equal(pedidoLitisSchema.safeParse({ mensaje: 'hola', contexto: 'EXP-26' }).success, false);
        assert.deepEqual(pedidoLitisSchema.parse({ mensaje: ' hola ' }), { mensaje: 'hola', historial: [] });
    });
});

describe('HU37 - modo expediente', () => {
    test('resuelve el contexto y lo agrega a las instrucciones', async () => {
        mock.method(expedientesRepository, 'getById', async () => EXPEDIENTE);
        const pedidos = simularIA(respuestaTexto('ok'));

        await asistenteService.conversar({ mensaje: '¿qué tareas tiene?', contexto: 'EXP-2026-26', historial: [] }, USUARIO);

        const instrucciones = pedidos[0].system.map((b) => b.text).join('\n');
        assert.match(instrucciones, /EXP-2026-26/);
        assert.match(instrucciones, /Pérez c\/ ACME s\/ daños/);
        assert.match(instrucciones, /Cliente: Juan Pérez/);
        assert.ok(pedidos[0].tools.some((t) => t.name === 'leer_documento'));
    });

    test('las herramientas usan el expediente abierto por defecto', async () => {
        mock.method(expedientesRepository, 'getById', async () => EXPEDIENTE);
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => []);
        simularIA(respuestaHerramienta('buscar_expedientes', {}), respuestaTexto('ok'));

        await asistenteService.conversar({ mensaje: 'datos de este expediente', contexto: 'EXP-2026-26', historial: [] }, USUARIO);

        assert.equal(buscar.mock.calls[0].arguments[0].expedienteId, 26);
    });

    test('un expediente inexistente o dado de baja devuelve NO_ENCONTRADO con mensaje claro', async () => {
        mock.method(expedientesRepository, 'getById', async () => null);
        simularIA(respuestaTexto('no debería llegar'));

        await assert.rejects(
            asistenteService.conversar({ mensaje: 'x', contexto: 'EXP-2026-999', historial: [] }, USUARIO),
            { statusCode: 404, codigo: 'NO_ENCONTRADO', message: 'No encontré el expediente EXP-2026-999.' }
        );
    });

    test('un número con el año equivocado no resuelve otro expediente', async () => {
        mock.method(expedientesRepository, 'getById', async () => EXPEDIENTE);
        await assert.rejects(asistenteService.resolverContexto('EXP-2019-26', USUARIO), { codigo: 'NO_ENCONTRADO' });
    });

    test('un expediente que no es del usuario responde SIN_ACCESO sin llamar a la IA', async () => {
        mock.method(expedientesRepository, 'getById', async () => EXPEDIENTE);
        const acceso = mock.method(accesoRepository, 'puedeVerExpediente', async () => false);
        const pedidos = simularIA(respuestaTexto('no debería llegar'));

        await assert.rejects(
            asistenteService.conversar({ mensaje: 'x', contexto: 'EXP-2026-26', historial: [] }, USUARIO),
            { statusCode: 403, codigo: 'SIN_ACCESO', message: 'Litis solo trabaja con tus expedientes, y EXP-2026-26 no está asignado a vos.' }
        );
        assert.deepEqual(acceso.mock.calls[0].arguments, [7, 26]);
        assert.equal(pedidos.length, 0);
    });

    test('sin contexto funciona normalmente y no ofrece herramientas de expediente', async () => {
        const getById = mock.method(expedientesRepository, 'getById');
        const pedidos = simularIA(respuestaTexto('ok'));

        await asistenteService.conversar({ mensaje: 'hola', historial: [] }, USUARIO);

        assert.equal(getById.mock.callCount(), 0);
        assert.ok(!pedidos[0].tools.some((t) => t.name === 'leer_documento'));
        // le indica al usuario como leer documentos
        assert.match(pedidos[0].system.map((b) => b.text).join('\n'), /pestaña Asistente del expediente/);
    });
});

describe('HU45 - lectura de documento bajo demanda', () => {
    const CTX = { usuario: USUARIO, expedienteId: 26, numeroExpediente: 'EXP-2026-26' };
    const DOCUMENTO = {
        id: 911, nombreArchivo: 'demanda.pdf', storageKey: 'lexora/documentos/demanda', activo: true,
        expedienteId: 26, tipoDocumento: 'Demanda',
    };

    function simularArchivo(bytes, headers = {}) {
        mock.method(cloudinaryDocumento, 'obtenerUrlDocumentoCloudinary', () => 'https://cloudinary.test/demanda');
        return mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers }));
    }

    test('lee un PDF del expediente y se lo envía solo a la IA', async () => {
        mock.method(asistenteRepository, 'obtenerDocumentoParaLectura', async () => DOCUMENTO);
        simularArchivo(Buffer.from('%PDF-1.7 demanda por $1.500.000'));

        const resultado = await leerDocumento.ejecutar({ documentoId: 911 }, CTX);

        assert.equal(resultado.contenido[0].type, 'document');
        assert.equal(resultado.contenido[0].source.media_type, 'application/pdf');
        assert.equal(Buffer.from(resultado.contenido[0].source.data, 'base64').toString(), '%PDF-1.7 demanda por $1.500.000');
        // al front solo va la tarjeta, nunca el contenido
        assert.deepEqual(Object.keys(resultado.items[0]).sort(),
            ['expedienteId', 'extension', 'id', 'numeroExpediente', 'subtitulo', 'tipo', 'titulo']);
        assert.doesNotMatch(JSON.stringify(resultado.resumen), /1\.500\.000/);
    });

    test('el contenido viaja a la IA dentro del tool_result del ciclo', async () => {
        mock.method(expedientesRepository, 'getById', async () => EXPEDIENTE);
        mock.method(asistenteRepository, 'obtenerDocumentoParaLectura', async () => DOCUMENTO);
        simularArchivo(Buffer.from('%PDF'));
        const pedidos = simularIA(
            respuestaHerramienta('leer_documento', { documentoId: 911 }),
            respuestaTexto('La demanda reclama $1.500.000.'),
        );

        const resultado = await asistenteService.conversar(
            { mensaje: '¿qué monto reclama la demanda?', contexto: 'EXP-2026-26', historial: [] }, USUARIO
        );

        const [documento, resumen] = pedidos[1].messages.at(-1).content[0].content;
        assert.equal(documento.type, 'document');
        assert.equal(resumen.type, 'text');
        assert.equal(resultado.respuesta, 'La demanda reclama $1.500.000.');
        assert.equal(resultado.resultados[0].id, 911);
    });

    test('no lee documentos de otro expediente', async () => {
        mock.method(asistenteRepository, 'obtenerDocumentoParaLectura', async () => ({ ...DOCUMENTO, expedienteId: 99 }));
        const fetch = simularArchivo(Buffer.from('%PDF'));

        await assert.rejects(leerDocumento.ejecutar({ documentoId: 911 }, CTX), { codigo: 'NO_ENCONTRADO' });
        assert.equal(fetch.mock.callCount(), 0);
    });

    test('avisa cuando el documento supera el límite de tamaño', async () => {
        process.env.LITIS_LECTURA_MAX_MB = '1';
        mock.method(asistenteRepository, 'obtenerDocumentoParaLectura', async () => DOCUMENTO);
        simularArchivo(Buffer.alloc(2 * 1024 * 1024));

        const resultado = await leerDocumento.ejecutar({ documentoId: 911 }, CTX);

        assert.match(resultado.resumen.aviso, /supera el límite de 1 MB/);
        assert.equal(resultado.contenido, undefined);
    });

    test('sin id busca el documento dentro del expediente; si hay varios pide aclaración', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => [
            { id: 1, nombreArchivo: 'demanda.pdf', tipoDocumento: 'Demanda' },
            { id: 2, nombreArchivo: 'ampliacion_demanda.pdf', tipoDocumento: 'Demanda' },
        ]);

        const resultado = await leerDocumento.ejecutar({ tipoDocumento: 'Demanda' }, CTX);

        assert.equal(buscar.mock.calls[0].arguments[0].expedienteId, 26);
        assert.equal(resultado.resumen.candidatos.length, 2);
        assert.equal(resultado.contenido, undefined);
    });

    test('formatos no soportados reciben un aviso', async () => {
        mock.method(asistenteRepository, 'obtenerDocumentoParaLectura', async () => ({ ...DOCUMENTO, nombreArchivo: 'poder.docx' }));
        const resultado = await leerDocumento.ejecutar({ documentoId: 911 }, CTX);
        assert.match(resultado.resumen.aviso, /\.docx/);
    });

    test('solo está disponible en modo expediente', async () => {
        assert.ok(!herramientas.disponibles({}).porNombre.leer_documento);
        await assert.rejects(leerDocumento.ejecutar({ documentoId: 911 }, { usuario: USUARIO }), { codigo: 'PEDIDO_INVALIDO' });
    });
});

describe('POST /api/asistente/mensajes', () => {
    let servidor;
    let base;

    beforeEach(async () => {
        // el log de seguridad (HU40) no se escribe en la base durante los tests
        mock.method(logsService, 'registrarEvento', async () => {});
        const app = require('../src/app');
        servidor = app.listen(0);
        await new Promise((resolve) => servidor.once('listening', resolve));
        base = `http://127.0.0.1:${servidor.address().port}/api/asistente/mensajes`;
    });

    afterEach(() => new Promise((resolve) => servidor.close(resolve)));

    function enviar(body, token) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        return fetch(base, { method: 'POST', headers, body: JSON.stringify(body) });
    }

    const token = () => jwt.sign(USUARIO, process.env.JWT_SECRET, { expiresIn: '1h' });

    test('responde solo a usuarios logueados', async () => {
        const respuesta = await enviar({ mensaje: 'hola' });
        assert.equal(respuesta.status, 401);
    });

    test('un pedido inválido devuelve PEDIDO_INVALIDO', async () => {
        const respuesta = await enviar({ mensaje: '' }, token());
        assert.equal(respuesta.status, 400);
        assert.deepEqual(await respuesta.json(), { codigo: 'PEDIDO_INVALIDO', mensaje: 'El mensaje no es válido.' });
    });

    test('sin clave de IA responde 503 ASISTENTE_NO_DISPONIBLE', async () => {
        const respuesta = await enviar({ mensaje: 'hola' }, token());
        assert.equal(respuesta.status, 503);
        assert.deepEqual(await respuesta.json(), { codigo: 'ASISTENTE_NO_DISPONIBLE', mensaje: 'Litis no está disponible en este momento.' });
    });

    test('con la IA disponible responde con el formato del contrato', async () => {
        simularIA(respuestaTexto('¡Hola!'));
        const respuesta = await enviar({ mensaje: 'hola' }, token());
        assert.equal(respuesta.status, 200);
        assert.deepEqual(await respuesta.json(), { respuesta: '¡Hola!', resultados: [] });
    });
});
