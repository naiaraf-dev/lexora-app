// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const llm = require('../src/config/llm');
const asistenteService = require('../src/services/asistente.service');
const busquedaService = require('../src/services/busqueda.service');
const busquedaRepository = require('../src/repositories/busqueda.repository');
const expedientesRepository = require('../src/repositories/expedientes.repository');
const accesoRepository = require('../src/repositories/acceso.repository');
const herramientas = require('../src/asistente/herramientas');
const listarTareas = require('../src/asistente/herramientas/listarTareas');
const listarNovedades = require('../src/asistente/herramientas/listarNovedades');
const { resultadoLitisSchema } = require('../src/asistente/asistente.schemas');
const { normalizarFiltros } = busquedaService;
const { armarFiltroTareas, armarFiltroNovedades } = busquedaRepository;

const USUARIO = { id: 7, nombre: 'Ana', apellido: 'Gómez' };
// las herramientas buscan solo en los expedientes del usuario de la sesion
const CTX = { usuario: USUARIO };

const TAREA = {
    id: 501,
    titulo: 'Contestar traslado de la pericia',
    descripcion: 'Impugnar el punto 3 de la pericia contable',
    fechaVencimiento: new Date('2025-06-10T00:00:00Z'),
    hora: '10:00',
    estado: 'Vencido',
    prioridad: 'Alta',
    expedienteId: 128,
    numeroExpediente: 'EXP-2025-128',
    caratula: 'Pérez c/ ACME S.A. s/ despido',
};

const NOVEDAD = {
    id: 71,
    titulo: 'Audiencia de vista de causa',
    descripcion: 'Se fijó audiencia para declaraciones testimoniales',
    fecha: new Date('2025-07-02T00:00:00Z'),
    tipo: 'Audiencia',
    esProcesal: true,
    expedienteId: 128,
    numeroExpediente: 'EXP-2025-128',
    caratula: 'Pérez c/ ACME S.A. s/ despido',
};

const criteriosRecibidos = (espia) => espia.mock.calls[0].arguments[0];
const condiciones = (filtro) => filtro.condiciones.join(' AND ');

afterEach(() => mock.restoreAll());

describe('HU36 - registro', () => {
    test('las herramientas de tareas y novedades están disponibles en los dos modos', () => {
        for (const ctx of [{}, { expedienteId: 128 }]) {
            const nombres = herramientas.disponibles(ctx).definiciones.map((d) => d.name);
            assert.ok(nombres.includes('listar_tareas'));
            assert.ok(nombres.includes('listar_novedades'));
        }
    });

    test('tienen descripción y no aceptan parámetros desconocidos', () => {
        for (const herramienta of [listarTareas, listarNovedades]) {
            assert.ok(herramienta.description.length > 50, herramienta.name);
            assert.equal(herramienta.input_schema.additionalProperties, false, herramienta.name);
        }
    });
});

describe('HU36 - armado del WHERE', () => {
    test('tareas: solo de expedientes activos', () => {
        assert.match(condiciones(armarFiltroTareas(normalizarFiltros({}))), /e\.activo = 1/);
    });

    test('tareas vencidas: las marcadas como vencidas y las pendientes con la fecha pasada', () => {
        const where = condiciones(armarFiltroTareas(normalizarFiltros({ estadoTarea: 'vencidas' })));
        assert.match(where, /t\.estado_tarea = 3/);
        assert.match(where, /t\.estado_tarea = 1 AND t\.fecha_vencimiento < CAST\(GETDATE\(\) AS date\)/);
    });

    test('tareas pendientes incluye las vencidas', () => {
        const where = condiciones(armarFiltroTareas(normalizarFiltros({ estadoTarea: 'pendientes' })));
        assert.match(where, /t\.estado_tarea = 1 OR/);
        assert.match(where, /t\.estado_tarea = 3/);
    });

    test('un estado desconocido o "todas" no filtra por estado', () => {
        for (const estadoTarea of ['todas', 'cualquiera']) {
            const where = condiciones(armarFiltroTareas(normalizarFiltros({ expedienteId: 1, estadoTarea })));
            assert.doesNotMatch(where, /estado_tarea/);
        }
    });

    test('tareas: el rango de fechas es sobre el vencimiento y el texto busca en título y descripción', () => {
        const filtro = armarFiltroTareas(normalizarFiltros({ texto: 'pericia', fechaDesde: '2025-06-01', fechaHasta: '2025-06-30' }));
        const where = condiciones(filtro);
        assert.match(where, /t\.titulo COLLATE Latin1_General_CI_AI LIKE @p0 OR t\.descripcion/);
        assert.match(where, /t\.fecha_vencimiento >= @p1/);
        assert.match(where, /t\.fecha_vencimiento < DATEADD\(day, 1, @p2\)/);
    });

    test('novedades: activas, de expedientes activos y opcionalmente solo procesales', () => {
        assert.doesNotMatch(condiciones(armarFiltroNovedades(normalizarFiltros({ expedienteId: 1 }))), /es_procesal/);

        const where = condiciones(armarFiltroNovedades(normalizarFiltros({ expedienteId: 1, soloProcesales: true })));
        assert.match(where, /n\.activo = 1/);
        assert.match(where, /e\.activo = 1/);
        assert.match(where, /n\.es_procesal = 1/);
    });

    test('novedades: el texto busca también en el tipo de novedad', () => {
        const where = condiciones(armarFiltroNovedades(normalizarFiltros({ texto: 'audiencia' })));
        assert.match(where, /tn\.nombre/);
    });

    test('un número interno se busca por id, igual que en expedientes y documentos', () => {
        const filtros = normalizarFiltros({ numeroCausa: 'EXP-2025-128' });
        const filtro = armarFiltroTareas(filtros);
        assert.match(condiciones(filtro), /t\.expediente = @p0/);
        assert.equal(filtro.parametros[0].valor, 128);
    });
});

describe('HU36 - servicio de búsqueda', () => {
    test('una tarea pendiente con la fecha pasada se informa como vencida', async () => {
        mock.method(busquedaRepository, 'buscarTareas', async () => [
            { id: 1, titulo: 'A', estadoNombre: 'Pendiente', vencida: true, expedienteId: 128, expedienteFechaCreacion: new Date(2025, 2, 1) },
            { id: 2, titulo: 'B', estadoNombre: 'Pendiente', vencida: false, expedienteId: 128, expedienteFechaCreacion: new Date(2025, 2, 1) },
        ]);

        const tareas = await busquedaService.buscarTareas({ expedienteId: 128 });
        assert.deepEqual(tareas.map((t) => t.estado), ['Vencido', 'Pendiente']);
        assert.equal(tareas[0].numeroExpediente, 'EXP-2025-128');
    });

    test('con un número interno de otro año no devuelve las tareas de ese id', async () => {
        mock.method(busquedaRepository, 'buscarTareas', async () => [
            { id: 1, titulo: 'A', estadoNombre: 'Pendiente', vencida: false, expedienteId: 128, expedienteFechaCreacion: new Date(2025, 2, 1) },
        ]);

        assert.deepEqual(await busquedaService.buscarTareas({ numeroCausa: 'EXP-2019-128' }), []);
    });

    test('sin criterios no consulta la base', async () => {
        const repo = mock.method(busquedaRepository, 'buscarNovedades', async () => []);
        assert.deepEqual(await busquedaService.buscarNovedades({}), []);
        assert.equal(repo.mock.callCount(), 0);
    });
});

describe('HU36 - listar_tareas', () => {
    test('en modo expediente lista las pendientes del expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarTareas', async () => []);
        await listarTareas.ejecutar({}, { ...CTX, expedienteId: 128 });
        assert.deepEqual(criteriosRecibidos(buscar), { estadoTarea: 'pendientes', usuarioId: 7, expedienteId: 128, limite: undefined });
    });

    test('si piden otro cliente no se limita al expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarTareas', async () => []);
        await listarTareas.ejecutar({ cliente: 'García', estado: 'vencidas' }, { ...CTX, expedienteId: 128 });
        assert.deepEqual(criteriosRecibidos(buscar), { cliente: 'García', estadoTarea: 'vencidas', usuarioId: 7, limite: undefined });
    });

    test('fuera de un expediente alcanza con pedir las vencidas', async () => {
        const buscar = mock.method(busquedaService, 'buscarTareas', async () => []);
        await listarTareas.ejecutar({ estado: 'vencidas' }, CTX);
        assert.deepEqual(criteriosRecibidos(buscar), { estadoTarea: 'vencidas', usuarioId: 7, limite: undefined });
    });

    test('fuera de un expediente, sin un estado válido ni criterios no consulta la base', async () => {
        const buscar = mock.method(busquedaService, 'buscarTareas', async () => []);
        for (const input of [{}, { estado: 'todas' }, { estado: 'vencida' }]) {
            const { resumen, items } = await listarTareas.ejecutar(input, CTX);
            assert.match(resumen.aviso, /criterio/);
            assert.deepEqual(items, []);
        }
        assert.equal(buscar.mock.callCount(), 0);
    });

    test('arma el resumen para la IA y tarjetas válidas para el front', async () => {
        mock.method(busquedaService, 'buscarTareas', async () => [TAREA]);
        const { resumen, items } = await listarTareas.ejecutar({}, { ...CTX, expedienteId: 128 });

        assert.deepEqual(resumen[0], {
            id: 501,
            titulo: 'Contestar traslado de la pericia',
            estado: 'Vencido',
            prioridad: 'Alta',
            vence: '2025-06-10',
            hora: '10:00',
            expediente: 'EXP-2025-128',
            caratula: 'Pérez c/ ACME S.A. s/ despido',
            descripcion: 'Impugnar el punto 3 de la pericia contable',
        });
        assert.deepEqual(items[0], {
            tipo: 'tarea',
            id: 501,
            titulo: 'Contestar traslado de la pericia',
            subtitulo: 'EXP-2025-128 · Vencido · vence 10/06/2025',
            expedienteId: 128,
            numeroExpediente: 'EXP-2025-128',
        });
        assert.ok(resultadoLitisSchema.safeParse(items[0]).success);
    });
});

describe('HU36 - listar_novedades', () => {
    test('en modo expediente lista las del expediente abierto', async () => {
        const buscar = mock.method(busquedaService, 'buscarNovedades', async () => []);
        await listarNovedades.ejecutar({}, { ...CTX, expedienteId: 128 });
        assert.deepEqual(criteriosRecibidos(buscar), { soloProcesales: false, usuarioId: 7, expedienteId: 128, limite: undefined });
    });

    test('sin criterios y sin expediente abierto no consulta la base', async () => {
        const buscar = mock.method(busquedaService, 'buscarNovedades', async () => []);
        const { resumen } = await listarNovedades.ejecutar({ soloProcesales: true }, CTX);
        assert.match(resumen.aviso, /criterio/);
        assert.equal(buscar.mock.callCount(), 0);
    });

    test('arma el resumen para la IA y tarjetas válidas para el front', async () => {
        mock.method(busquedaService, 'buscarNovedades', async () => [NOVEDAD]);
        const { resumen, items } = await listarNovedades.ejecutar({ texto: 'audiencia' }, CTX);

        assert.equal(resumen[0].fecha, '2025-07-02');
        assert.equal(resumen[0].procesal, true);
        assert.deepEqual(items[0], {
            tipo: 'novedad',
            id: 71,
            titulo: 'Audiencia de vista de causa',
            subtitulo: 'EXP-2025-128 · Audiencia · 02/07/2025',
            expedienteId: 128,
            numeroExpediente: 'EXP-2025-128',
        });
        assert.ok(resultadoLitisSchema.safeParse(items[0]).success);
    });
});

describe('HU36 - recorrido completo con la IA simulada', () => {
    test('"¿qué tareas están pendientes?" desde un expediente devuelve las tareas como tarjetas', async () => {
        mock.method(llm, 'estaDisponible', () => true);
        mock.method(accesoRepository, 'puedeVerExpediente', async () => true);
        mock.method(expedientesRepository, 'getById', async () => ({
            id: 128, fecha_creacion: new Date(2025, 2, 1), caratula: 'Pérez c/ ACME S.A. s/ despido', clienteNombre: 'Juan Pérez',
        }));
        const buscar = mock.method(busquedaService, 'buscarTareas', async () => [TAREA]);

        const respuestas = [
            { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'listar_tareas', input: {} }] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Tenés una tarea vencida: contestar el traslado de la pericia.' }] },
        ];
        mock.method(llm, 'enviar', async () => respuestas.shift());

        const { respuesta, resultados, herramientasUsadas } = await asistenteService.conversar(
            { mensaje: '¿Qué tareas están pendientes en este expediente?', contexto: 'EXP-2025-128', historial: [] },
            USUARIO,
        );

        assert.equal(criteriosRecibidos(buscar).expedienteId, 128);
        assert.equal(criteriosRecibidos(buscar).usuarioId, 7);
        assert.deepEqual(herramientasUsadas, ['listar_tareas']);
        assert.match(respuesta, /vencida/);
        assert.deepEqual(resultados.map((r) => `${r.tipo}:${r.id}`), ['tarea:501']);
    });
});
