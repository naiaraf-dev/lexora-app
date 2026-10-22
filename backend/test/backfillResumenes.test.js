// los tests nunca llaman a la IA real: la clave del .env no se carga (dotenv no pisa variables existentes)
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';

const { describe, test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const resumenesService = require('../src/services/resumenes.service');
const { leerOpciones, categoriaDe, estimar, procesarCola } = require('../scripts/backfill-resumenes');

const LOTE_VACIO = { procesado: 0, error: 0, omitido: 0, pospuesto: 0 };

// devuelve los resultados de lote en orden; despues, lotes vacios
function simularLotes(...lotes) {
    let vez = 0;
    return mock.method(resumenesService, 'procesarLote', async () => lotes[vez++] ?? LOTE_VACIO);
}

const sinLog = { log: () => {} };

afterEach(() => mock.restoreAll());

describe('HU43 - opciones del script', () => {
    test('valores por defecto', () => {
        const opciones = leerOpciones([]);
        assert.equal(opciones.simular, false);
        assert.equal(opciones.soloEncolar, false);
        assert.equal(opciones.lote, 5);
        assert.equal(opciones.pausaSegundos, 5);
        assert.equal(opciones.limite, 1_000_000);
    });

    test('lee las opciones de la línea de comandos', () => {
        const opciones = leerOpciones(['--simular', '--lote', '10', '--limite', '20', '--pausa', '2', '--si', '--reintentar-errores']);
        assert.deepEqual(
            [opciones.simular, opciones.lote, opciones.limite, opciones.pausaSegundos, opciones.confirmado, opciones.reintentarErrores],
            [true, 10, 20, 2, true, true]
        );
    });

    test('un número inválido usa el valor por defecto', () => {
        assert.equal(leerOpciones(['--lote', 'muchos']).lote, 5);
        assert.equal(leerOpciones(['--limite', '-3']).limite, 1_000_000);
    });
});

describe('HU43 - estimación', () => {
    test('clasifica los documentos por tipo', () => {
        assert.equal(categoriaDe('demanda.PDF'), 'pdf');
        assert.equal(categoriaDe('foto.jpg'), 'imagen');
        assert.equal(categoriaDe('escrito.docx'), 'word');
        assert.equal(categoriaDe('planilla.xlsx'), 'noSoportado');
        assert.equal(categoriaDe('sin_extension'), 'noSoportado');
    });

    test('cuenta por tipo y estima tokens y costo con el precio del modelo', () => {
        const documentos = [
            { nombreArchivo: 'a.pdf' }, { nombreArchivo: 'b.pdf' }, { nombreArchivo: 'c.png' }, { nombreArchivo: 'd.xlsx' },
        ];

        const estimacion = estimar(documentos, 'claude-sonnet-5-5');

        assert.deepEqual(estimacion.porTipo, { pdf: 2, imagen: 1, word: 0, noSoportado: 1 });
        assert.equal(estimacion.aResumir, 3);
        assert.equal(estimacion.tokensEntrada, 2 * 20_000 + 2_000);
        assert.equal(estimacion.tokensSalida, 3 * 1_000);
        // (42.000 × $2 + 3.000 × $10) / 1.000.000
        assert.equal(estimacion.costoUsd, 0.114);
    });

    test('sin precio cargado para el modelo no inventa un costo', () => {
        assert.equal(estimar([{ nombreArchivo: 'a.pdf' }], 'modelo-desconocido').costoUsd, null);
    });

    test('sin documentos la estimación es cero', () => {
        const estimacion = estimar([], 'claude-sonnet-5-5');
        assert.equal(estimacion.aResumir, 0);
        assert.equal(estimacion.costoUsd, 0);
    });
});

describe('HU43 - procesamiento de la cola', () => {
    test('procesa lotes hasta vaciar la cola, con pausa entre lotes', async () => {
        const procesar = simularLotes(
            { procesado: 5, error: 0, omitido: 0, pospuesto: 0 },
            { procesado: 2, error: 1, omitido: 1, pospuesto: 0 },
        );
        const pausas = [];

        const totales = await procesarCola(
            { lote: 5, maxIntentos: 3, pausaSegundos: 2 },
            { dormir: async (s) => pausas.push(s), ...sinLog }
        );

        assert.deepEqual(totales, { procesado: 7, error: 1, omitido: 1, abandonado: false });
        assert.equal(procesar.mock.callCount(), 3);
        assert.deepEqual(procesar.mock.calls[0].arguments[0], { lote: 5, maxIntentos: 3 });
        assert.deepEqual(pausas, [2, 2]);
    });

    test('un documento con error no frena el resto', async () => {
        simularLotes({ procesado: 3, error: 2, omitido: 0, pospuesto: 0 });

        const totales = await procesarCola({ lote: 5, maxIntentos: 3, pausaSegundos: 0 }, { dormir: async () => {}, ...sinLog });

        assert.equal(totales.procesado, 3);
        assert.equal(totales.error, 2);
    });

    test('si el proveedor no responde, espera y reintenta', async () => {
        simularLotes(
            { procesado: 0, error: 0, omitido: 0, pospuesto: 5 },
            { procesado: 5, error: 0, omitido: 0, pospuesto: 0 },
        );
        const pausas = [];

        const totales = await procesarCola(
            { lote: 5, maxIntentos: 3, pausaSegundos: 2 },
            { dormir: async (s) => pausas.push(s), ...sinLog }
        );

        assert.equal(pausas[0], 60);
        assert.equal(totales.procesado, 5);
        assert.equal(totales.abandonado, false);
    });

    test('si el proveedor sigue sin responder, abandona y deja los pendientes en la cola', async () => {
        const caido = { procesado: 0, error: 0, omitido: 0, pospuesto: 5 };
        const procesar = simularLotes(caido, caido, caido, caido, caido);

        const totales = await procesarCola({ lote: 5, maxIntentos: 3, pausaSegundos: 0 }, { dormir: async () => {}, ...sinLog });

        assert.equal(totales.abandonado, true);
        assert.equal(procesar.mock.callCount(), 4);
    });
});
