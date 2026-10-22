// Genera los resúmenes con IA de los documentos cargados antes de la HU42 (HU43).
//
// Uso (desde backend/):
//   npm run backfill:resumenes -- --simular           muestra cuántos documentos hay y el costo estimado, sin tocar nada
//   npm run backfill:resumenes                        encola y procesa todos (pide confirmación)
//   npm run backfill:resumenes -- --limite 20         encola y procesa como máximo 20 documentos
//   npm run backfill:resumenes -- --solo-encolar      solo los encola; los procesa el job del servidor (RESUMEN_IA_HABILITADO=true)
//   npm run backfill:resumenes -- --reintentar-errores  vuelve a intentar los documentos que quedaron con error
//
// Opciones: --lote N (por ejecución, 5) · --pausa S (segundos entre lotes, 5) · --si (no pide confirmación)
//
// Se puede cortar y volver a correr: los documentos ya encolados o procesados no se repiten.

require('dotenv').config();

const path = require('path');
const readline = require('readline/promises');
const llm = require('../src/config/llm');
const resumenesRepository = require('../src/repositories/resumenes.repository');
const resumenesService = require('../src/services/resumenes.service');

// estimacion aproximada de tokens de entrada por documento segun su tipo;
// un PDF de ~10 paginas, una imagen y un Word mediano. La salida (el resumen) ronda los 1.000 tokens
const TOKENS_ENTRADA_ESTIMADOS = { pdf: 20_000, imagen: 2_000, word: 8_000 };
const TOKENS_SALIDA_ESTIMADOS = 1_000;

// precio en USD por millon de tokens (entrada, salida). Verificar en la pagina de precios del proveedor
const PRECIOS_POR_MILLON = {
    'claude-sonnet-5-5': [2, 10],
    'claude-haiku-5-5': [0.1, 0.5],
    'claude-opus-5-5': [4, 20],
    'claude-opus-5': [5, 25],
    'claude-sonnet-5': [2, 10],
};

// pausa larga cuando el proveedor de IA no responde, y cuantas veces se espera antes de abandonar
const ESPERA_PROVEEDOR_SEGUNDOS = 60;
const MAX_ESPERAS_PROVEEDOR = 3;

const SIN_LIMITE = 1_000_000;

function leerOpciones(argv = process.argv.slice(2)) {
    const valor = (nombre, porDefecto) => {
        const indice = argv.indexOf(nombre);
        const numero = indice >= 0 ? Number(argv[indice + 1]) : NaN;
        return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
    };

    return {
        simular: argv.includes('--simular'),
        soloEncolar: argv.includes('--solo-encolar'),
        reintentarErrores: argv.includes('--reintentar-errores'),
        confirmado: argv.includes('--si'),
        lote: valor('--lote', 5),
        limite: valor('--limite', SIN_LIMITE),
        pausaSegundos: valor('--pausa', 5),
        maxIntentos: Number(process.env.RESUMEN_IA_MAX_INTENTOS) > 0 ? Number(process.env.RESUMEN_IA_MAX_INTENTOS) : 3,
    };
}

function categoriaDe(nombreArchivo) {
    const extension = path.extname(nombreArchivo ?? '').slice(1).toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'imagen';
    if (['doc', 'docx'].includes(extension)) return 'word';
    return 'noSoportado';
}

// cuenta los documentos por tipo y estima tokens y costo
function estimar(documentos, modelo) {
    const porTipo = { pdf: 0, imagen: 0, word: 0, noSoportado: 0 };
    for (const documento of documentos) porTipo[categoriaDe(documento.nombreArchivo)]++;

    const aResumir = documentos.length - porTipo.noSoportado;
    const tokensEntrada =
        porTipo.pdf * TOKENS_ENTRADA_ESTIMADOS.pdf +
        porTipo.imagen * TOKENS_ENTRADA_ESTIMADOS.imagen +
        porTipo.word * TOKENS_ENTRADA_ESTIMADOS.word;
    const tokensSalida = aResumir * TOKENS_SALIDA_ESTIMADOS;

    const precios = PRECIOS_POR_MILLON[modelo];
    const costoUsd = precios
        ? (tokensEntrada * precios[0] + tokensSalida * precios[1]) / 1_000_000
        : null;

    return { total: documentos.length, porTipo, aResumir, tokensEntrada, tokensSalida, costoUsd };
}

function mostrarEstimacion(estimacion, modelo) {
    const { total, porTipo, aResumir, tokensEntrada, tokensSalida, costoUsd } = estimacion;
    console.log(`\nDocumentos sin resumen: ${total}`);
    console.log(`  PDF: ${porTipo.pdf} · imágenes: ${porTipo.imagen} · Word: ${porTipo.word} · no soportados (se omiten): ${porTipo.noSoportado}`);
    console.log(`Modelo: ${modelo}`);
    console.log(`Tokens estimados: ~${tokensEntrada.toLocaleString('es-AR')} de entrada y ~${tokensSalida.toLocaleString('es-AR')} de salida`);
    console.log(costoUsd === null
        ? 'Costo estimado: sin precio cargado para este modelo'
        : `Costo estimado: ~USD ${costoUsd.toFixed(2)} (aproximado: depende de la cantidad de páginas de cada documento)`);
    if (aResumir === 0) console.log('No hay documentos para resumir.');
}

const esperar = (segundos) => new Promise((resolve) => setTimeout(resolve, segundos * 1000));

/**
 * Procesa la cola de a lotes hasta vaciarla.
 * Si el proveedor de IA no responde, espera y reintenta; despues de varias esperas abandona
 * (los documentos quedan en la cola y se retoman en la proxima corrida o con el job).
 */
async function procesarCola({ lote, maxIntentos, pausaSegundos }, { dormir = esperar, log = console.log } = {}) {
    const totales = { procesado: 0, error: 0, omitido: 0 };
    let esperasProveedor = 0;

    for (;;) {
        const resultado = await resumenesService.procesarLote({ lote, maxIntentos });
        totales.procesado += resultado.procesado;
        totales.error += resultado.error;
        totales.omitido += resultado.omitido;

        const atendidos = resultado.procesado + resultado.error + resultado.omitido;
        log(`  lote: ${resultado.procesado} resumidos, ${resultado.error} con error, ${resultado.omitido} omitidos` +
            (resultado.pospuesto ? `, ${resultado.pospuesto} pospuestos` : ''));

        if (resultado.pospuesto > 0) {
            esperasProveedor++;
            if (esperasProveedor > MAX_ESPERAS_PROVEEDOR) {
                log('El proveedor de IA no responde. Se corta el proceso: los pendientes quedan en la cola.');
                return { ...totales, abandonado: true };
            }
            log(`  El proveedor de IA no responde: se espera ${ESPERA_PROVEEDOR_SEGUNDOS} s y se reintenta.`);
            await dormir(ESPERA_PROVEEDOR_SEGUNDOS);
            continue;
        }

        if (atendidos === 0) return { ...totales, abandonado: false };

        esperasProveedor = 0;
        await dormir(pausaSegundos);
    }
}

async function confirmar(pregunta) {
    const consola = readline.createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await consola.question(`${pregunta} (s/n) `);
    consola.close();
    return respuesta.trim().toLowerCase().startsWith('s');
}

async function main() {
    const opciones = leerOpciones();
    const { modelo } = llm.configuracion();

    if (!opciones.simular && !opciones.soloEncolar && !llm.estaDisponible()) {
        console.error('Falta ANTHROPIC_API_KEY en el .env. Usá --simular para ver la estimación o --solo-encolar.');
        return 1;
    }

    if (opciones.reintentarErrores && !opciones.simular) {
        const reiniciados = await resumenesRepository.reiniciarErrores();
        console.log(`Documentos con error que vuelven a la cola: ${reiniciados}`);
    }

    const candidatos = await resumenesRepository.listarSinResumen(opciones.limite);
    const estimacion = estimar(candidatos, modelo);
    mostrarEstimacion(estimacion, modelo);

    if (opciones.simular) {
        console.log('\nSimulación: no se encoló ni se procesó nada.');
        return 0;
    }

    if (candidatos.length > 0) {
        if (!opciones.confirmado && !(await confirmar(`\n¿Encolar ${candidatos.length} documentos?`))) {
            console.log('Cancelado.');
            return 0;
        }
        const encolados = await resumenesRepository.encolarSinResumen(opciones.limite);
        console.log(`Encolados: ${encolados}`);
    }

    if (opciones.soloEncolar) {
        console.log('Los procesa el job del servidor cuando RESUMEN_IA_HABILITADO=true.');
        return 0;
    }

    console.log('\nProcesando...');
    const totales = await procesarCola(opciones);

    console.log(`\nResumidos: ${totales.procesado} · con error: ${totales.error} · omitidos: ${totales.omitido}`);
    console.log('Estado de la cola:', await resumenesRepository.contarPorEstado());

    const errores = await resumenesRepository.listarErrores();
    if (errores.length > 0) {
        console.log('\nDocumentos con error (se reintentan con --reintentar-errores):');
        for (const e of errores) console.log(`  ${e.documentoId} ${e.nombreArchivo} (${e.intentos} intentos): ${e.ultimoError}`);
    }

    return totales.abandonado ? 1 : 0;
}

if (require.main === module) {
    main()
        .then((codigo) => process.exit(codigo))
        .catch((error) => {
            console.error('Error en el backfill:', error.message);
            process.exit(1);
        });
}

module.exports = { leerOpciones, categoriaDe, estimar, procesarCola, main };
