// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const busquedaRepository = require('../src/repositories/busqueda.repository');
const busquedaService = require('../src/services/busqueda.service');

const {
    escaparLike,
    armarFiltroExpedientes,
    armarFiltroDocumentos,
    armarFiltroClientes,
} = busquedaRepository;
const { normalizarFiltros, tieneCriterios } = busquedaService;

const SIN_ACENTOS = 'COLLATE Latin1_General_CI_AI';

// valores de los parametros que se mandan a SQL Server
const valores = (filtro) => filtro.parametros.map((p) => p.valor);

afterEach(() => mock.restoreAll());

describe('escaparLike', () => {
    test('escapa los comodines de LIKE', () => {
        assert.equal(escaparLike('100%_a[b'), '100[%][_]a[[]b');
    });

    test('deja el texto normal sin cambios', () => {
        assert.equal(escaparLike('Pérez'), 'Pérez');
    });
});

describe('normalizarFiltros', () => {
    test('recorta espacios del texto', () => {
        assert.equal(normalizarFiltros({ texto: '  demanda   perez ' }).texto, 'demanda perez');
    });

    test('un texto vacio queda como undefined', () => {
        assert.equal(normalizarFiltros({ texto: '   ' }).texto, undefined);
    });

    test('usa 10 resultados por defecto', () => {
        assert.equal(normalizarFiltros({}).limite, 10);
    });

    test('nunca permite mas de 25 resultados', () => {
        assert.equal(normalizarFiltros({ limite: 500 }).limite, 25);
    });

    test('ignora limites invalidos', () => {
        assert.equal(normalizarFiltros({ limite: -3 }).limite, 10);
        assert.equal(normalizarFiltros({ limite: 'muchos' }).limite, 10);
    });

    test('acepta fechas YYYY-MM-DD validas', () => {
        const f = normalizarFiltros({ fechaDesde: '2025-01-01' });
        assert.equal(f.fechaDesde.toISOString(), '2025-01-01T00:00:00.000Z');
    });

    test('descarta fechas invalidas o con otro formato', () => {
        assert.equal(normalizarFiltros({ fechaDesde: '2025-13-40' }).fechaDesde, undefined);
        assert.equal(normalizarFiltros({ fechaDesde: '01/02/2025' }).fechaDesde, undefined);
    });

    test('convierte un numero interno del texto en id de expediente', () => {
        const f = normalizarFiltros({ texto: 'EXP-2025-128' });
        assert.equal(f.expedienteId, 128);
        assert.equal(f.anioExpediente, 2025);
        assert.equal(f.texto, undefined);
    });

    test('convierte un numero interno del numero de causa en id de expediente', () => {
        const f = normalizarFiltros({ numeroCausa: 'exp-2025-7' });
        assert.equal(f.expedienteId, 7);
        assert.equal(f.numeroCausa, undefined);
    });

    test('un numero de causa judicial se mantiene como texto', () => {
        const f = normalizarFiltros({ numeroCausa: '12345/2025' });
        assert.equal(f.numeroCausa, '12345/2025');
        assert.equal(f.expedienteId, undefined);
    });
});

describe('tieneCriterios', () => {
    test('sin filtros no hay criterios', () => {
        assert.equal(tieneCriterios(normalizarFiltros({})), false);
    });

    test('solo el limite no cuenta como criterio', () => {
        assert.equal(tieneCriterios(normalizarFiltros({ limite: 5 })), false);
    });

    test('cualquier filtro cuenta como criterio', () => {
        assert.equal(tieneCriterios(normalizarFiltros({ cliente: 'perez' })), true);
    });
});

describe('armarFiltroExpedientes', () => {
    test('siempre filtra expedientes activos', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({}));
        assert.deepEqual(filtro.condiciones, ['e.activo = 1']);
    });

    test('cada palabra del texto genera una condicion sin acentos', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'demanda perez' }));
        assert.deepEqual(valores(filtro), ['%demanda%', '%perez%']);
        assert.equal(filtro.condiciones.filter((c) => c.includes(SIN_ACENTOS)).length, 2);
    });

    test('cada palabra se busca en caratula, descripcion y contraparte', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'despido' }));
        const condicion = filtro.condiciones[1];
        assert.match(condicion, /e\.caratula/);
        assert.match(condicion, /e\.descripcion/);
        assert.match(condicion, /e\.contraparte/);
    });

    test('usa como maximo 5 palabras del texto', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'a b c d e f g' }));
        assert.equal(filtro.parametros.length, 5);
    });

    test('escapa los comodines del texto del usuario', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: '100%' }));
        assert.deepEqual(valores(filtro), ['%100[%]%']);
    });

    test('filtra por numero de causa', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ numeroCausa: '12345/2025' }));
        assert.ok(filtro.condiciones.some((c) => c.includes('e.numero_expediente_judicial')));
        assert.deepEqual(valores(filtro), ['%12345/2025%']);
    });

    test('un numero interno filtra por id en SQL; el año se valida en el servicio', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'EXP-2025-128' }));
        assert.ok(filtro.condiciones.includes('e.id = @p0'));
        assert.ok(!filtro.condiciones.some((c) => c.includes('YEAR(')));
        assert.deepEqual(valores(filtro), [128]);
    });

    test('filtra por estado y area', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ estado: 'en tramite', area: 'laboral' }));
        assert.ok(filtro.condiciones.some((c) => c.includes('ee.nombre')));
        assert.ok(filtro.condiciones.some((c) => c.includes('e.area')));
    });

    test('el rango de fechas incluye el dia completo de la fecha hasta', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31' }));
        assert.ok(filtro.condiciones.includes('e.fecha_inicio >= @p0'));
        assert.ok(filtro.condiciones.includes('e.fecha_inicio < DATEADD(day, 1, @p1)'));
    });

    test('los parametros se numeran sin repetirse', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'demanda', cliente: 'perez', numeroCausa: '123' }));
        const nombres = filtro.parametros.map((p) => p.nombre);
        assert.deepEqual(nombres, ['p0', 'p1', 'p2']);
    });
});

describe('armarFiltroDocumentos', () => {
    test('filtra documentos activos de expedientes activos', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({}));
        assert.deepEqual(filtro.condiciones, ['d.activo = 1', 'e.activo = 1']);
    });

    test('el texto busca en nombre de archivo, descripcion, caratula y tipo', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({ texto: 'demanda' }));
        const condicion = filtro.condiciones[2];
        assert.match(condicion, /d\.nombre_archivo/);
        assert.match(condicion, /d\.descripcion/);
        assert.match(condicion, /e\.caratula/);
        assert.match(condicion, /td\.nombre/);
    });

    test('combina cliente, tipo de documento y fechas', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({
            cliente: 'perez',
            tipoDocumento: 'demanda',
            fechaDesde: '2025-01-01',
            fechaHasta: '2025-12-31',
        }));
        assert.ok(filtro.condiciones.some((c) => c.includes("CONCAT(c.nombre, ' ', c.apellido)")));
        assert.ok(filtro.condiciones.some((c) => c.includes('td.nombre')));
        assert.ok(filtro.condiciones.some((c) => c.startsWith('COALESCE(d.fecha_documento, d.fecha_creacion) >=')));
        assert.ok(filtro.condiciones.some((c) => c.includes('DATEADD')));
    });

    test('filtra por expediente', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({ expedienteId: 128 }));
        assert.ok(filtro.condiciones.includes('d.expediente = @p0'));
    });
});

describe('armarFiltroClientes', () => {
    test('siempre filtra clientes activos', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({}));
        assert.deepEqual(filtro.condiciones, ['c.activo = 1']);
    });

    test('un DNI con puntos busca por DNI o CUIT sin separadores', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ cliente: '30.123.456' }));
        assert.deepEqual(valores(filtro), ['%30123456%']);
        assert.match(filtro.condiciones[1], /c\.dni/);
        assert.match(filtro.condiciones[1], /c\.cuit/);
    });

    test('un CUIT con guiones busca por DNI o CUIT', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ cliente: '20-30123456-7' }));
        assert.deepEqual(valores(filtro), ['%20301234567%']);
    });

    test('un nombre busca por nombre y apellido, palabra por palabra', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ cliente: 'Juan Perez' }));
        assert.deepEqual(valores(filtro), ['%Juan%', '%Perez%']);
    });

    test('pocos digitos se buscan como nombre, no como DNI', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ cliente: '123' }));
        assert.doesNotMatch(filtro.condiciones[1], /c\.dni/);
    });

    test('si no hay cliente usa el texto libre', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ texto: 'garcia' }));
        assert.deepEqual(valores(filtro), ['%garcia%']);
    });
});

describe('busquedaService (repositorio simulado)', () => {
    test('sin criterios no consulta la base', async () => {
        const consulta = mock.method(busquedaRepository, 'buscarExpedientes', async () => []);
        assert.deepEqual(await busquedaService.buscarExpedientes({}), []);
        assert.equal(consulta.mock.callCount(), 0);
    });

    test('le pasa al repositorio los filtros normalizados', async () => {
        const consulta = mock.method(busquedaRepository, 'buscarExpedientes', async () => []);
        await busquedaService.buscarExpedientes({ cliente: '  perez ', limite: 100 });
        const recibido = consulta.mock.calls[0].arguments[0];
        assert.equal(recibido.cliente, 'perez');
        assert.equal(recibido.limite, 25);
    });

    test('buscarExpedientes arma el numero interno y limpia el cliente', async () => {
        mock.method(busquedaRepository, 'buscarExpedientes', async () => [{
            id: 128,
            caratula: 'Pérez c/ ACME S.A. s/ despido',
            numeroExpedienteJudicial: '12345/2025',
            area: 'Laboral',
            fechaInicio: new Date('2025-03-01T00:00:00Z'),
            fechaCreacion: new Date('2025-03-01T12:00:00Z'),
            tipoNombre: 'Demanda Laboral',
            estadoNombre: 'En trámite',
            clienteId: 4,
            clienteNombre: 'Juan Pérez',
        }]);

        const [expediente] = await busquedaService.buscarExpedientes({ cliente: 'perez' });

        assert.equal(expediente.numeroInterno, 'EXP-2025-128');
        assert.equal(expediente.cliente, 'Juan Pérez');
        assert.equal(expediente.tipo, 'Demanda Laboral');
        assert.equal(expediente.estado, 'En trámite');
    });

    test('buscarExpedientes devuelve cliente null si el expediente no tiene cliente', async () => {
        mock.method(busquedaRepository, 'buscarExpedientes', async () => [{
            id: 1,
            fechaCreacion: new Date('2025-03-01T12:00:00Z'),
            clienteNombre: ' ',
        }]);

        const [expediente] = await busquedaService.buscarExpedientes({ texto: 'algo' });
        assert.equal(expediente.cliente, null);
    });

    test('buscarDocumentos calcula la extension y el expediente', async () => {
        mock.method(busquedaRepository, 'buscarDocumentos', async () => [{
            id: 911,
            nombreArchivo: 'Demanda_Perez.PDF',
            descripcion: null,
            fechaDocumento: null,
            fechaCreacion: new Date('2025-03-14T12:00:00Z'),
            tipoDocumento: 'Demanda',
            expedienteId: 128,
            caratula: 'Pérez c/ ACME S.A. s/ despido',
            expedienteFechaCreacion: new Date('2025-03-01T12:00:00Z'),
        }]);

        const [documento] = await busquedaService.buscarDocumentos({ tipoDocumento: 'demanda' });

        assert.equal(documento.extension, 'pdf');
        assert.equal(documento.numeroExpediente, 'EXP-2025-128');
        // sin fecha del documento usa la fecha de carga
        assert.equal(documento.fecha.toISOString(), '2025-03-14T12:00:00.000Z');
    });

    test('buscarDocumentos devuelve extension null si el archivo no tiene', async () => {
        mock.method(busquedaRepository, 'buscarDocumentos', async () => [{
            id: 1,
            nombreArchivo: 'escrito',
            expedienteId: 1,
            expedienteFechaCreacion: new Date('2025-03-01T12:00:00Z'),
        }]);

        const [documento] = await busquedaService.buscarDocumentos({ texto: 'escrito' });
        assert.equal(documento.extension, null);
    });

    test('buscarClientes sin nombre ni texto no consulta la base', async () => {
        const consulta = mock.method(busquedaRepository, 'buscarClientes', async () => []);
        assert.deepEqual(await busquedaService.buscarClientes({ area: 'laboral' }), []);
        assert.equal(consulta.mock.callCount(), 0);
    });

    test('buscarClientes arma el nombre completo', async () => {
        mock.method(busquedaRepository, 'buscarClientes', async () => [{
            id: 4,
            nombre: 'Juan',
            apellido: 'Pérez',
            dni: '30.123.456',
            cuit: null,
            cantidadExpedientes: 2,
        }]);

        const [cliente] = await busquedaService.buscarClientes({ cliente: 'perez' });

        assert.equal(cliente.nombreCompleto, 'Juan Pérez');
        assert.equal(cliente.cantidadExpedientes, 2);
    });
});

describe('numero interno: el año coincide con el que ve el usuario', () => {
    // fecha de creacion cerca del cambio de año: segun la zona horaria, el año visible puede no ser el de UTC
    const FECHA_CREACION = new Date('2026-01-01T01:00:00Z');
    const ANIO_VISIBLE = FECHA_CREACION.getFullYear();
    const OTRO_ANIO = ANIO_VISIBLE - 1;

    test('el numero que se muestra encuentra el expediente', async () => {
        mock.method(busquedaRepository, 'buscarExpedientes', async () => [{ id: 128, fechaCreacion: FECHA_CREACION }]);

        const resultados = await busquedaService.buscarExpedientes({ texto: `EXP-${ANIO_VISIBLE}-128` });

        assert.equal(resultados.length, 1);
        assert.equal(resultados[0].numeroInterno, `EXP-${ANIO_VISIBLE}-128`);
    });

    test('el mismo id con otro año no devuelve el expediente', async () => {
        mock.method(busquedaRepository, 'buscarExpedientes', async () => [{ id: 128, fechaCreacion: FECHA_CREACION }]);

        const resultados = await busquedaService.buscarExpedientes({ texto: `EXP-${OTRO_ANIO}-128` });

        assert.deepEqual(resultados, []);
    });

    test('en documentos se valida contra el año del expediente', async () => {
        mock.method(busquedaRepository, 'buscarDocumentos', async () => [{
            id: 911, nombreArchivo: 'demanda.pdf', expedienteId: 128, expedienteFechaCreacion: FECHA_CREACION,
        }]);

        assert.equal((await busquedaService.buscarDocumentos({ numeroCausa: `EXP-${ANIO_VISIBLE}-128` })).length, 1);
        assert.equal((await busquedaService.buscarDocumentos({ numeroCausa: `EXP-${OTRO_ANIO}-128` })).length, 0);
    });

    test('un expedienteId suelto no filtra por año', async () => {
        mock.method(busquedaRepository, 'buscarExpedientes', async () => [{ id: 128, fechaCreacion: FECHA_CREACION }]);

        assert.equal((await busquedaService.buscarExpedientes({ expedienteId: 128 })).length, 1);
    });
});

describe('HU44 - búsqueda de documentos en los resúmenes', () => {
    test('el texto libre también busca en resumen, palabras clave, tipo detectado y partes', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({ texto: 'horas' }));
        const condicion = filtro.condiciones.at(-1);

        assert.match(condicion, /d\.nombre_archivo/);
        assert.match(condicion, /dr\.resumen/);
        assert.match(condicion, /dr\.palabras_clave/);
        assert.match(condicion, /dr\.tipo_detectado/);
        assert.match(condicion, /JSON_VALUE\(dr\.datos_json, '\$\.partes\.actor'\)/);
        assert.match(condicion, /JSON_VALUE\(dr\.datos_json, '\$\.partes\.demandado'\)/);
    });

    test('las columnas del resumen también ignoran acentos', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({ texto: 'desvinculacion' }));
        assert.match(filtro.condiciones.at(-1), /dr\.resumen COLLATE Latin1_General_CI_AI LIKE/);
    });

    test('el tipo de documento busca en el tipo cargado y en el detectado por la IA', () => {
        const filtro = armarFiltroDocumentos(normalizarFiltros({ tipoDocumento: 'demanda' }));
        const condicion = filtro.condiciones.at(-1);

        assert.match(condicion, /td\.nombre/);
        assert.match(condicion, /dr\.tipo_detectado/);
    });

    test('el servicio devuelve el resumen, o null si el documento todavía no tiene', async () => {
        mock.method(busquedaRepository, 'buscarDocumentos', async () => [
            { id: 1, nombreArchivo: 'a.pdf', expedienteId: 1, expedienteFechaCreacion: new Date(), resumen: 'Demanda por despido.' },
            { id: 2, nombreArchivo: 'b.pdf', expedienteId: 1, expedienteFechaCreacion: new Date(), resumen: null },
        ]);

        const [conResumen, sinResumen] = await busquedaService.buscarDocumentos({ texto: 'demanda' });

        assert.equal(conResumen.resumen, 'Demanda por despido.');
        assert.equal(sinResumen.resumen, null);
    });
});

describe('restricción a los expedientes del usuario', () => {
    const ACCESO = /\(e\.usuario_principal = @p0 OR e\.usuario_secundario = @p0\)/;
    const { armarFiltroTareas, armarFiltroNovedades } = busquedaRepository;

    test('expedientes, documentos, tareas y novedades filtran por abogado responsable o secundario', () => {
        for (const armar of [armarFiltroExpedientes, armarFiltroDocumentos, armarFiltroTareas, armarFiltroNovedades]) {
            const filtro = armar(normalizarFiltros({ usuarioId: 7, texto: 'x' }));
            assert.match(filtro.condiciones.join(' AND '), ACCESO, armar.name);
            assert.equal(filtro.parametros[0].valor, 7);
        }
    });

    test('clientes: solo los que tienen algún expediente activo del usuario', () => {
        const filtro = armarFiltroClientes(normalizarFiltros({ usuarioId: 7, cliente: 'perez' }));
        assert.match(filtro.condiciones.join(' AND '), /EXISTS \(SELECT 1 FROM expediente e WHERE e\.cliente = c\.id AND e\.activo = 1 AND \(e\.usuario_principal = @p0/);
    });

    test('sin usuario no se agrega la restricción (el servicio sigue sirviendo para otros usos)', () => {
        const filtro = armarFiltroExpedientes(normalizarFiltros({ texto: 'x' }));
        assert.doesNotMatch(filtro.condiciones.join(' AND '), /usuario_principal/);
    });

    test('el usuario no cuenta como criterio: sin criterios no se busca nada', () => {
        assert.equal(tieneCriterios(normalizarFiltros({ usuarioId: 7 })), false);
        assert.equal(normalizarFiltros({ usuarioId: 'abc' }).usuarioId, undefined);
    });
});
