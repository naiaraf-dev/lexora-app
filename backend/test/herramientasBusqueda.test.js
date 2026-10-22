// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const llm = require('../src/config/llm');
const asistenteService = require('../src/services/asistente.service');
const busquedaService = require('../src/services/busqueda.service');
const herramientas = require('../src/asistente/herramientas');
const buscarExpedientes = require('../src/asistente/herramientas/buscarExpedientes');
const buscarDocumentos = require('../src/asistente/herramientas/buscarDocumentos');
const buscarClientes = require('../src/asistente/herramientas/buscarClientes');
const { resultadoLitisSchema } = require('../src/asistente/asistente.schemas');

const USUARIO = { id: 7, nombre: 'Ana', apellido: 'Gómez' };
// las herramientas buscan solo en los expedientes del usuario de la sesion
const CTX = { usuario: USUARIO };

const EXPEDIENTE = {
    id: 128,
    numeroInterno: 'EXP-2025-128',
    caratula: 'Pérez c/ ACME S.A. s/ despido',
    numeroExpedienteJudicial: '12345/2025',
    area: 'Laboral',
    tipo: 'Demanda Laboral',
    estado: 'En trámite',
    clienteId: 4,
    cliente: 'Juan Pérez',
    fechaInicio: new Date('2025-03-01T00:00:00Z'),
};

const DOCUMENTO = {
    id: 911,
    nombreArchivo: 'demanda_perez.pdf',
    extension: 'pdf',
    descripcion: 'Demanda inicial con liquidación',
    tipoDocumento: 'Demanda',
    fecha: new Date('2025-03-14T00:00:00Z'),
    expedienteId: 128,
    numeroExpediente: 'EXP-2025-128',
    caratula: 'Pérez c/ ACME S.A. s/ despido',
};

const CLIENTE = {
    id: 4,
    nombreCompleto: 'Juan Pérez',
    dni: '30.123.456',
    cuit: '20-30123456-7',
    cantidadExpedientes: 2,
};

const criteriosRecibidos = (espia) => espia.mock.calls[0].arguments[0];

afterEach(() => mock.restoreAll());

describe('HU35 - registro de herramientas de búsqueda', () => {
    test('las tres herramientas están registradas y la de prueba ya no', () => {
        const nombres = herramientas.definiciones.map((d) => d.name);
        assert.ok(nombres.includes('buscar_expedientes'));
        assert.ok(nombres.includes('buscar_documentos'));
        assert.ok(nombres.includes('buscar_clientes'));
        assert.ok(!nombres.includes('prueba_buscar_expedientes'));
    });

    test('están disponibles fuera del modo expediente', () => {
        const nombres = herramientas.disponibles({}).definiciones.map((d) => d.name);
        assert.deepEqual(nombres, ['buscar_expedientes', 'buscar_documentos', 'buscar_clientes', 'listar_tareas', 'listar_novedades']);
    });

    test('cada herramienta tiene descripción y no acepta parámetros desconocidos', () => {
        for (const herramienta of [buscarExpedientes, buscarDocumentos, buscarClientes]) {
            assert.ok(herramienta.description.length > 50, herramienta.name);
            assert.equal(herramienta.input_schema.additionalProperties, false, herramienta.name);
        }
    });
});

describe('HU35 - buscar_expedientes', () => {
    test('pasa solo los criterios conocidos al servicio de búsqueda', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => []);

        await buscarExpedientes.ejecutar({ cliente: 'Pérez', estado: 'En trámite', inventado: 'x', limite: 5 }, CTX);

        assert.deepEqual(criteriosRecibidos(buscar), { cliente: 'Pérez', estado: 'En trámite', usuarioId: 7, limite: 5 });
    });

    test('arma el resumen para la IA y las tarjetas para el front', async () => {
        mock.method(busquedaService, 'buscarExpedientes', async () => [EXPEDIENTE]);

        const { resumen, items } = await buscarExpedientes.ejecutar({ cliente: 'Pérez' }, CTX);

        assert.deepEqual(resumen, [{
            id: 128,
            numero: 'EXP-2025-128',
            caratula: 'Pérez c/ ACME S.A. s/ despido',
            numeroCausa: '12345/2025',
            estado: 'En trámite',
            tipo: 'Demanda Laboral',
            area: 'Laboral',
            cliente: 'Juan Pérez',
            fechaInicio: '2025-03-01',
        }]);
        assert.deepEqual(items, [{
            tipo: 'expediente',
            id: 128,
            titulo: 'Pérez c/ ACME S.A. s/ despido',
            subtitulo: 'EXP-2025-128 · En trámite · Juan Pérez',
            expedienteId: 128,
            numeroExpediente: 'EXP-2025-128',
        }]);
        assert.ok(resultadoLitisSchema.safeParse(items[0]).success);
    });

    test('sin criterios y sin expediente abierto no consulta la base y avisa a la IA', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => []);

        const { resumen, items } = await buscarExpedientes.ejecutar({ texto: '  ' }, CTX);

        assert.equal(buscar.mock.callCount(), 0);
        assert.match(resumen.aviso, /criterio/);
        assert.deepEqual(items, []);
    });

    test('sin criterios en modo expediente busca el expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => [EXPEDIENTE]);

        await buscarExpedientes.ejecutar({}, { ...CTX, expedienteId: 128 });

        assert.equal(criteriosRecibidos(buscar).expedienteId, 128);
    });

    test('con criterios en modo expediente no se limita al expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarExpedientes', async () => []);

        await buscarExpedientes.ejecutar({ cliente: 'García' }, { ...CTX, expedienteId: 128 });

        assert.equal(criteriosRecibidos(buscar).expedienteId, undefined);
    });
});

describe('HU35 - buscar_documentos', () => {
    test('combina cliente, tipo de documento y fechas', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => []);

        await buscarDocumentos.ejecutar({
            cliente: 'Pérez', tipoDocumento: 'Demanda', fechaDesde: '2025-01-01', fechaHasta: '2025-12-31',
        }, CTX);

        assert.deepEqual(criteriosRecibidos(buscar), {
            cliente: 'Pérez', tipoDocumento: 'Demanda', fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', usuarioId: 7, limite: undefined,
        });
    });

    test('a la IA no le llega la descripción ni el archivo', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [DOCUMENTO]);

        const { resumen } = await buscarDocumentos.ejecutar({ cliente: 'Pérez' }, CTX);

        assert.deepEqual(resumen, [{
            id: 911,
            nombre: 'demanda_perez.pdf',
            tipo: 'Demanda',
            fecha: '2025-03-14',
            expediente: 'EXP-2025-128',
            caratula: 'Pérez c/ ACME S.A. s/ despido',
            contenido: undefined,
        }]);
        assert.doesNotMatch(JSON.stringify(resumen), /liquidación/);
    });

    test('las tarjetas traen lo necesario para ver, descargar e ir al expediente', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [DOCUMENTO]);

        const { items } = await buscarDocumentos.ejecutar({ cliente: 'Pérez' }, CTX);

        assert.deepEqual(items, [{
            tipo: 'documento',
            id: 911,
            titulo: 'demanda_perez.pdf',
            subtitulo: 'EXP-2025-128 · Demanda · 14/03/2025',
            expedienteId: 128,
            numeroExpediente: 'EXP-2025-128',
            extension: 'pdf',
        }]);
        assert.ok(resultadoLitisSchema.safeParse(items[0]).success);
    });

    test('un archivo sin extensión sigue siendo una tarjeta válida', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [{ ...DOCUMENTO, nombreArchivo: 'escrito', extension: null }]);

        const { items } = await buscarDocumentos.ejecutar({ texto: 'escrito' }, CTX);

        assert.equal(items[0].extension, undefined);
        assert.ok(resultadoLitisSchema.safeParse(items[0]).success);
    });

    test('en modo expediente busca en el expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => []);

        await buscarDocumentos.ejecutar({ tipoDocumento: 'Demanda' }, { ...CTX, expedienteId: 128 });

        assert.equal(criteriosRecibidos(buscar).expedienteId, 128);
    });

    test('en modo expediente, si piden otro cliente no se limita al expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => []);

        await buscarDocumentos.ejecutar({ cliente: 'García' }, { ...CTX, expedienteId: 128 });

        assert.equal(criteriosRecibidos(buscar).expedienteId, undefined);
    });

    test('un expedienteId explícito tiene prioridad sobre el expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => []);

        await buscarDocumentos.ejecutar({ expedienteId: 300 }, { ...CTX, expedienteId: 128 });

        assert.equal(criteriosRecibidos(buscar).expedienteId, 300);
    });

    test('sin criterios y sin expediente abierto no consulta la base', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => []);

        const { resumen } = await buscarDocumentos.ejecutar({}, CTX);

        assert.equal(buscar.mock.callCount(), 0);
        assert.match(resumen.aviso, /criterio/);
    });
});

describe('HU35 - buscar_clientes', () => {
    test('busca por el texto como nombre, DNI o CUIT', async () => {
        const buscar = mock.method(busquedaService, 'buscarClientes', async () => []);

        await buscarClientes.ejecutar({ texto: '30.123.456', limite: 3 }, CTX);

        assert.deepEqual(criteriosRecibidos(buscar), { cliente: '30.123.456', usuarioId: 7, limite: 3 });
    });

    test('a la IA no le llegan DNI ni CUIT', async () => {
        mock.method(busquedaService, 'buscarClientes', async () => [CLIENTE]);

        const { resumen, items } = await buscarClientes.ejecutar({ texto: 'Pérez' }, CTX);

        assert.deepEqual(resumen, [{ id: 4, nombre: 'Juan Pérez', expedientesActivos: 2 }]);
        assert.doesNotMatch(JSON.stringify({ resumen, items }), /30\.?123\.?456/);
    });

    test('las tarjetas indican cuántos expedientes activos tiene el cliente', async () => {
        mock.method(busquedaService, 'buscarClientes', async () => [CLIENTE, { ...CLIENTE, id: 5, nombreCompleto: 'Juana Pérez', cantidadExpedientes: 1 }]);

        const { items } = await buscarClientes.ejecutar({ texto: 'Pérez' }, CTX);

        assert.deepEqual(items.map((i) => i.subtitulo), ['2 expedientes activos', '1 expediente activo']);
        assert.ok(items.every((i) => resultadoLitisSchema.safeParse(i).success));
    });

    test('sin texto no consulta la base', async () => {
        const buscar = mock.method(busquedaService, 'buscarClientes', async () => []);

        const { resumen } = await buscarClientes.ejecutar({}, CTX);

        assert.equal(buscar.mock.callCount(), 0);
        assert.match(resumen.aviso, /criterio/);
    });
});

describe('HU35 - recorrido completo con la IA simulada', () => {
    test('"traeme la demanda de Pérez" devuelve la demanda como tarjeta', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [DOCUMENTO]);
        mock.method(llm, 'estaDisponible', () => true);
        const respuestas = [
            {
                stop_reason: 'tool_use',
                content: [{ type: 'tool_use', id: 'toolu_1', name: 'buscar_documentos', input: { cliente: 'Pérez', tipoDocumento: 'Demanda' } }],
            },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Encontré la demanda de Juan Pérez.' }] },
        ];
        let vuelta = 0;
        mock.method(llm, 'enviar', async () => respuestas[vuelta++]);

        const resultado = await asistenteService.conversar({ mensaje: 'traeme la demanda de Pérez', historial: [] }, USUARIO);

        assert.equal(resultado.respuesta, 'Encontré la demanda de Juan Pérez.');
        assert.equal(resultado.resultados.length, 1);
        assert.equal(resultado.resultados[0].tipo, 'documento');
        assert.equal(resultado.resultados[0].id, 911);
    });
});

describe('HU44 - buscar_documentos usa los resúmenes', () => {
    const RESUMEN = 'Demanda laboral por despido sin causa. El actor reclama indemnización, preaviso y horas extra impagas.';

    test('a la IA le llega el resumen del documento para explicar por qué lo eligió', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [{ ...DOCUMENTO, resumen: RESUMEN }]);

        const { resumen } = await buscarDocumentos.ejecutar({ texto: 'horas extra' }, CTX);

        assert.equal(resumen[0].contenido, RESUMEN);
    });

    test('un resumen largo se recorta para no gastar tokens', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [{ ...DOCUMENTO, resumen: 'palabra '.repeat(100) }]);

        const { resumen } = await buscarDocumentos.ejecutar({ texto: 'palabra' }, CTX);

        assert.ok(resumen[0].contenido.length <= 301);
        assert.ok(resumen[0].contenido.endsWith('…'));
    });

    test('el resumen no va en las tarjetas del front', async () => {
        mock.method(busquedaService, 'buscarDocumentos', async () => [{ ...DOCUMENTO, resumen: RESUMEN }]);

        const { items } = await buscarDocumentos.ejecutar({ texto: 'horas extra' }, CTX);

        assert.doesNotMatch(JSON.stringify(items), /despido sin causa/);
    });

    test('la descripción le indica a la IA que puede buscar por contenido', () => {
        assert.match(buscarDocumentos.description, /por lo que dice el documento/);
        assert.match(buscarDocumentos.description, /horas extra/);
    });

    test('recorrido completo: "el escrito donde reclaman horas extra"', async () => {
        const buscar = mock.method(busquedaService, 'buscarDocumentos', async () => [
            { ...DOCUMENTO, nombreArchivo: 'escrito_final_v2.pdf', resumen: RESUMEN },
        ]);
        mock.method(llm, 'estaDisponible', () => true);
        const pedidos = [];
        const respuestas = [
            {
                stop_reason: 'tool_use',
                content: [{ type: 'tool_use', id: 'toolu_1', name: 'buscar_documentos', input: { texto: 'horas extra' } }],
            },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Es escrito_final_v2.pdf: reclama horas extra impagas.' }] },
        ];
        mock.method(llm, 'enviar', async (pedido) => {
            pedidos.push({ ...pedido, messages: [...pedido.messages] });
            return respuestas[pedidos.length - 1];
        });

        const resultado = await asistenteService.conversar({ mensaje: 'buscame el escrito donde reclaman horas extra', historial: [] }, USUARIO);

        assert.equal(criteriosRecibidos(buscar).texto, 'horas extra');
        assert.match(pedidos[1].messages.at(-1).content[0].content[0].text, /horas extra impagas/);
        assert.equal(resultado.resultados[0].titulo, 'escrito_final_v2.pdf');
    });
});
