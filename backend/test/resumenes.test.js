// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const llm = require('../src/config/llm');
const resumenesRepository = require('../src/repositories/resumenes.repository');
const resumenesService = require('../src/services/resumenes.service');
const cloudinaryDocumento = require('../src/services/cloudinaryDocumento.service');
const extraccionTexto = require('../src/services/extraccionTexto.service');
const resumenesJob = require('../src/jobs/resumenes.job');
const { ESQUEMA_JSON_RESUMEN, resumenSchema, unirPalabrasClave } = require('../src/asistente/resumen.schema');

// respuesta valida de la IA
const RESUMEN_IA = {
    tipo_detectado: 'Demanda',
    resumen: 'Demanda laboral por despido sin causa. El actor reclama indemnización y horas extra.',
    palabras_clave: ['despido', 'desvinculación', 'Despido', 'horas extra'],
    partes: { actor: 'Juan Pérez', demandado: 'ACME S.A.', otros: [] },
    fechas: [{ fecha: '2025-03-14', descripcion: 'fecha del despido' }],
    montos: [{ monto: 4500000, moneda: 'ARS', concepto: 'monto reclamado' }],
    temas: ['despido sin causa'],
};

const DOCUMENTO = { id: 911, nombreArchivo: 'demanda_perez.pdf', storageKey: 'lexora/documentos/demanda', activo: true };

// un .docx real (es un ZIP) para las pruebas de Word
const ESCRITO_DOCX = fs.readFileSync(path.join(__dirname, 'fixtures', 'escrito.docx'));

// ZIP minimo que declara una entrada de 2 GB descomprimida: lo que haria una "zip bomb"
function zipQueSeInfla(bytesDescomprimidos) {
    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt32LE(bytesDescomprimidos, 24);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0);
    fin.writeUInt16LE(1, 8);
    fin.writeUInt16LE(1, 10);
    fin.writeUInt32LE(entrada.length, 12);
    fin.writeUInt32LE(0, 16);
    return Buffer.concat([entrada, fin]);
}

function respuestaIA(datos = RESUMEN_IA, extra = {}) {
    return { stop_reason: 'end_turn', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify(datos) }], ...extra };
}

// simula la base: guarda lo que el servicio le pide al repositorio
function simularRepositorio(documento = DOCUMENTO) {
    return {
        obtener: mock.method(resumenesRepository, 'obtenerDocumento', async () => documento),
        guardar: mock.method(resumenesRepository, 'guardarResumen', async () => {}),
        error: mock.method(resumenesRepository, 'registrarError', async () => {}),
        omitir: mock.method(resumenesRepository, 'marcarOmitido', async () => {}),
        devolver: mock.method(resumenesRepository, 'devolverAPendiente', async () => {}),
    };
}

function simularArchivo(contenido = Buffer.from('%PDF-1.7'), status = 200) {
    mock.method(cloudinaryDocumento, 'obtenerUrlDocumentoCloudinary', () => 'https://cloudinary.test/archivo');
    return mock.method(globalThis, 'fetch', async () => new Response(contenido, { status }));
}

beforeEach(() => mock.method(console, 'error', () => {}));
afterEach(() => mock.restoreAll());

describe('HU42 - esquema del resumen', () => {
    test('el esquema que se le pide a la IA exige todos los campos y no acepta otros', () => {
        assert.deepEqual(ESQUEMA_JSON_RESUMEN.required.sort(), Object.keys(ESQUEMA_JSON_RESUMEN.properties).sort());
        assert.equal(ESQUEMA_JSON_RESUMEN.additionalProperties, false);
        assert.equal(ESQUEMA_JSON_RESUMEN.properties.partes.additionalProperties, false);
        assert.equal(ESQUEMA_JSON_RESUMEN.properties.fechas.items.additionalProperties, false);
        assert.equal(ESQUEMA_JSON_RESUMEN.properties.montos.items.additionalProperties, false);
    });

    test('valida una respuesta correcta', () => {
        assert.ok(resumenSchema.safeParse(RESUMEN_IA).success);
    });

    test('rechaza un resumen vacío o con campos faltantes', () => {
        assert.equal(resumenSchema.safeParse({ ...RESUMEN_IA, resumen: '  ' }).success, false);
        const { partes, ...sinPartes } = RESUMEN_IA;
        assert.equal(resumenSchema.safeParse(sinPartes).success, false);
    });

    test('recorta el resumen al largo de la columna', () => {
        const largo = resumenSchema.parse({ ...RESUMEN_IA, resumen: 'a'.repeat(3000) });
        assert.equal(largo.resumen.length, 2000);
    });

    test('las palabras clave se unen sin repetidas y sin pasarse del largo', () => {
        assert.equal(unirPalabrasClave(['despido', 'Despido', 'horas extra']), 'despido, horas extra');
        assert.equal(unirPalabrasClave(['abc', 'def', 'ghi'], 8), 'abc, def');
    });
});

describe('HU42 - extracción de texto de Word', () => {
    test('extrae y normaliza el texto de un .docx real', async () => {
        const buffer = fs.readFileSync(path.join(__dirname, 'fixtures', 'escrito.docx'));

        const texto = await extraccionTexto.textoDeWord(buffer, 'docx');

        assert.match(texto, /PROMUEVE DEMANDA LABORAL/);
        assert.match(texto, /Juan Pérez contra ACME S\.A\./);
        assert.match(texto, /Se reclaman horas extra impagas\./);
        assert.doesNotMatch(texto, /\n{3,}/);
    });

    test('reconoce los formatos Word', () => {
        assert.equal(extraccionTexto.esWord('docx'), true);
        assert.equal(extraccionTexto.esWord('doc'), true);
        assert.equal(extraccionTexto.esWord('pdf'), false);
    });
});

describe('HU42 - contenido que se envía a la IA', () => {
    test('un PDF se envía directo como documento', async () => {
        const contenido = await resumenesService.armarContenido(Buffer.from('%PDF'), 'pdf');

        assert.equal(contenido[0].type, 'document');
        assert.equal(contenido[0].source.media_type, 'application/pdf');
        assert.equal(Buffer.from(contenido[0].source.data, 'base64').toString(), '%PDF');
    });

    test('una imagen se envía directo (la IA lee escaneos y fotos)', async () => {
        const contenido = await resumenesService.armarContenido(Buffer.from('png'), 'png');
        assert.equal(contenido[0].type, 'image');
        assert.equal(contenido[0].source.media_type, 'image/png');
    });

    test('un Word se convierte a texto antes de enviarlo', async () => {
        mock.method(extraccionTexto, 'textoDeWord', async () => 'Texto del escrito');

        const contenido = await resumenesService.armarContenido(ESCRITO_DOCX, 'docx');

        assert.equal(contenido[0].type, 'text');
        assert.match(contenido[0].text, /Texto del escrito/);
    });

    test('un Word muy largo se recorta y se le avisa a la IA', async () => {
        mock.method(extraccionTexto, 'textoDeWord', async () => 'x'.repeat(500_000));

        const [bloque] = await resumenesService.armarContenido(ESCRITO_DOCX, 'docx');

        assert.match(bloque.text, /se muestra solo el comienzo/);
        assert.ok(bloque.text.length < 401_000);
    });

    test('un Word sin texto no se puede resumir', async () => {
        mock.method(extraccionTexto, 'textoDeWord', async () => '');
        await assert.rejects(resumenesService.armarContenido(Buffer.from('docx'), 'docx'), resumenesService.DocumentoNoResumible);
    });

    test('un tipo no soportado no se puede resumir', async () => {
        await assert.rejects(resumenesService.armarContenido(Buffer.from('x'), 'xlsx'), /no soportado: \.xlsx/);
    });
});

describe('HU42 - topes de memoria', () => {
    afterEach(() => { delete process.env.RESUMEN_IA_MAX_MB; });

    test('un .docx que se infla de más al descomprimirlo no se descomprime', async () => {
        const extraer = mock.method(extraccionTexto, 'textoDeWord', async () => 'no debería llegar');

        await assert.rejects(
            resumenesService.armarContenido(zipQueSeInfla(0x7fffffff), 'docx'),
            (error) => error instanceof resumenesService.DocumentoNoResumible && /demasiado grande/.test(error.message),
        );
        assert.equal(extraer.mock.callCount(), 0);
    });

    test('un .docx dañado se omite sin intentar leerlo', async () => {
        const extraer = mock.method(extraccionTexto, 'textoDeWord', async () => 'x');
        await assert.rejects(resumenesService.armarContenido(Buffer.from('no es un zip'), 'docx'), /dañado/);
        assert.equal(extraer.mock.callCount(), 0);
    });

    test('mide el tamaño descomprimido de un .docx real sin descomprimirlo', () => {
        const tamanio = extraccionTexto.tamanioDescomprimidoZip(ESCRITO_DOCX);
        assert.ok(tamanio > ESCRITO_DOCX.length && tamanio < 1024 * 1024, String(tamanio));
        assert.equal(extraccionTexto.tamanioDescomprimidoZip(zipQueSeInfla(0xffffffff)), Infinity);
    });

    test('un archivo más grande que el tope se omite aunque el servidor no diga su tamaño', async () => {
        process.env.RESUMEN_IA_MAX_MB = '0.001'; // unos 1000 bytes
        const repo = simularRepositorio();
        simularArchivo(Buffer.alloc(5000));
        const ia = mock.method(llm, 'enviar', async () => respuestaIA());

        assert.equal(await resumenesService.procesarDocumento(911), 'omitido');
        assert.match(repo.omitir.mock.calls[0].arguments[1], /supera el límite/);
        assert.equal(ia.mock.callCount(), 0);
    });

    test('si el servidor declara un tamaño mayor al tope, ni siquiera lo descarga', async () => {
        process.env.RESUMEN_IA_MAX_MB = '1';
        simularRepositorio();
        mock.method(cloudinaryDocumento, 'obtenerUrlDocumentoCloudinary', () => 'https://cloudinary.test/archivo');
        mock.method(globalThis, 'fetch', async () => new Response('x', { headers: { 'content-length': String(50 * 1024 * 1024) } }));

        assert.equal(await resumenesService.procesarDocumento(911), 'omitido');
    });
});

describe('HU42 - pedido a la IA', () => {
    test('pide la respuesta con el esquema como salida estructurada', async () => {
        const enviar = mock.method(llm, 'enviar', async () => respuestaIA());

        const { datos, modelo } = await resumenesService.generarResumen([{ type: 'text', text: 'x' }]);

        const pedido = enviar.mock.calls[0].arguments[0];
        assert.deepEqual(pedido.outputConfig, { format: { type: 'json_schema', schema: ESQUEMA_JSON_RESUMEN } });
        assert.match(pedido.system[0].text, /No incluyas DNI, CUIT/);
        assert.equal(datos.tipo_detectado, 'Demanda');
        assert.equal(modelo, 'claude-sonnet-5-5');
    });

    test('un rechazo de la IA es un error', async () => {
        mock.method(llm, 'enviar', async () => ({ stop_reason: 'refusal', content: [] }));
        await assert.rejects(resumenesService.generarResumen([]), /rechazó/);
    });

    test('una respuesta cortada es un error', async () => {
        mock.method(llm, 'enviar', async () => respuestaIA(RESUMEN_IA, { stop_reason: 'max_tokens' }));
        await assert.rejects(resumenesService.generarResumen([]), /incompleta/);
    });

    test('un JSON inválido o con otro formato es un error', async () => {
        mock.method(llm, 'enviar', async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'no es json' }] }));
        await assert.rejects(resumenesService.generarResumen([]), /JSON válido/);

        mock.restoreAll();
        mock.method(llm, 'enviar', async () => respuestaIA({ resumen: 'solo esto' }));
        await assert.rejects(resumenesService.generarResumen([]), /formato esperado/);
    });
});

describe('HU42 - procesar un documento', () => {
    test('descarga, resume y guarda el resultado', async () => {
        const repo = simularRepositorio();
        simularArchivo();
        mock.method(llm, 'enviar', async () => respuestaIA());

        const estado = await resumenesService.procesarDocumento(911);

        assert.equal(estado, 'procesado');
        const [documentoId, guardado] = repo.guardar.mock.calls[0].arguments;
        assert.equal(documentoId, 911);
        assert.equal(guardado.tipoDetectado, 'Demanda');
        assert.equal(guardado.palabrasClave, 'despido, desvinculación, horas extra');
        assert.equal(guardado.modelo, 'claude-sonnet-5-5');
        assert.deepEqual(JSON.parse(guardado.datosJson), {
            partes: RESUMEN_IA.partes, fechas: RESUMEN_IA.fechas, montos: RESUMEN_IA.montos, temas: RESUMEN_IA.temas,
        });
    });

    test('un documento dado de baja o sin archivo se omite', async () => {
        const repo = simularRepositorio({ ...DOCUMENTO, activo: false });
        const fetch = simularArchivo();

        assert.equal(await resumenesService.procesarDocumento(911), 'omitido');
        assert.equal(fetch.mock.callCount(), 0);
        assert.equal(repo.omitir.mock.callCount(), 1);
    });

    test('un tipo no soportado se omite sin descargarlo', async () => {
        const repo = simularRepositorio({ ...DOCUMENTO, nombreArchivo: 'planilla.xlsx' });
        const fetch = simularArchivo();

        assert.equal(await resumenesService.procesarDocumento(911), 'omitido');
        assert.equal(fetch.mock.callCount(), 0);
        assert.match(repo.omitir.mock.calls[0].arguments[1], /\.xlsx/);
    });

    test('si falla la descarga se registra el error para reintentar', async () => {
        const repo = simularRepositorio();
        simularArchivo(Buffer.from(''), 404);

        assert.equal(await resumenesService.procesarDocumento(911), 'error');
        assert.match(repo.error.mock.calls[0].arguments[1], /HTTP 404/);
        assert.equal(repo.guardar.mock.callCount(), 0);
    });

    test('si la respuesta de la IA es inválida se registra el error', async () => {
        const repo = simularRepositorio();
        simularArchivo();
        mock.method(llm, 'enviar', async () => respuestaIA({ resumen: '' }));

        assert.equal(await resumenesService.procesarDocumento(911), 'error');
        assert.equal(repo.error.mock.callCount(), 1);
    });

    test('si el proveedor de IA no está disponible se pospone sin gastar un intento', async () => {
        const repo = simularRepositorio();
        simularArchivo();
        mock.method(llm, 'enviar', async () => { throw llm.errorNoDisponible(); });

        assert.equal(await resumenesService.procesarDocumento(911), 'pospuesto');
        assert.equal(repo.devolver.mock.callCount(), 1);
        assert.equal(repo.error.mock.callCount(), 0);
    });
});

describe('HU42 - procesar un lote', () => {
    test('sin clave de IA no toma nada de la cola', async () => {
        mock.method(llm, 'estaDisponible', () => false);
        const tomar = mock.method(resumenesRepository, 'tomarLote', async () => [1]);

        const resultado = await resumenesService.procesarLote({ lote: 5, maxIntentos: 3 });

        assert.equal(tomar.mock.callCount(), 0);
        assert.deepEqual(resultado, { procesado: 0, error: 0, omitido: 0, pospuesto: 0 });
    });

    test('libera trabados, toma el lote y procesa cada documento', async () => {
        mock.method(llm, 'estaDisponible', () => true);
        const liberar = mock.method(resumenesRepository, 'liberarTrabados', async () => {});
        const tomar = mock.method(resumenesRepository, 'tomarLote', async () => [1, 2]);
        simularRepositorio({ ...DOCUMENTO, nombreArchivo: 'x.xlsx' });

        const resultado = await resumenesService.procesarLote({ lote: 5, maxIntentos: 3 });

        assert.equal(liberar.mock.callCount(), 1);
        assert.deepEqual(tomar.mock.calls[0].arguments, [5, 3]);
        assert.equal(resultado.omitido, 2);
    });

    test('si el proveedor se cae, el resto del lote vuelve a la cola', async () => {
        mock.method(llm, 'estaDisponible', () => true);
        mock.method(resumenesRepository, 'liberarTrabados', async () => {});
        mock.method(resumenesRepository, 'tomarLote', async () => [1, 2, 3]);
        const repo = simularRepositorio();
        simularArchivo();
        const enviar = mock.method(llm, 'enviar', async () => { throw llm.errorNoDisponible(); });

        const resultado = await resumenesService.procesarLote({ lote: 5, maxIntentos: 3 });

        assert.equal(enviar.mock.callCount(), 1);
        assert.equal(resultado.pospuesto, 3);
        assert.deepEqual(repo.devolver.mock.calls.map((c) => c.arguments[0]), [1, 2, 3]);
    });
});

describe('HU42 - encolar', () => {
    test('marca el documento como pendiente', async () => {
        const marcar = mock.method(resumenesRepository, 'marcarPendiente', async () => {});
        await resumenesService.encolar(911);
        assert.deepEqual(marcar.mock.calls[0].arguments, [911]);
    });

    test('si no puede encolar no hace fallar la subida', async () => {
        mock.method(resumenesRepository, 'marcarPendiente', async () => { throw new Error('base caída'); });
        await assert.doesNotReject(resumenesService.encolar(911));
    });
});

describe('HU42 - proceso en segundo plano', () => {
    afterEach(() => {
        delete process.env.RESUMEN_IA_HABILITADO;
        delete process.env.RESUMEN_IA_CRON;
    });

    test('está desactivado si RESUMEN_IA_HABILITADO no es "true"', () => {
        mock.method(console, 'log', () => {});
        assert.equal(resumenesJob.iniciar(), null);
    });

    test('no arranca con una expresión cron inválida', () => {
        process.env.RESUMEN_IA_HABILITADO = 'true';
        process.env.RESUMEN_IA_CRON = 'cada tanto';
        assert.equal(resumenesJob.iniciar(), null);
    });

    test('valores por defecto: cada 2 minutos, lote de 5, 3 intentos', () => {
        assert.deepEqual(resumenesJob.configuracion(), { habilitado: false, expresion: '*/2 * * * *', lote: 5, maxIntentos: 3 });
    });

    test('no superpone ejecuciones', async () => {
        let terminar;
        const procesar = mock.method(resumenesService, 'procesarLote', () => new Promise((resolve) => { terminar = resolve; }));

        const primera = resumenesJob.ejecutarUnaVez({ lote: 5, maxIntentos: 3 });
        const segunda = await resumenesJob.ejecutarUnaVez({ lote: 5, maxIntentos: 3 });
        terminar({ procesado: 0, error: 0, omitido: 0, pospuesto: 0 });
        await primera;

        assert.equal(segunda, null);
        assert.equal(procesar.mock.callCount(), 1);
    });
});
