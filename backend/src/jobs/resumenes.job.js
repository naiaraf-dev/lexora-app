const cron = require('node-cron');
const resumenesService = require('../services/resumenes.service');

// proceso en segundo plano que resume los documentos pendientes (HU42)

function enteroPositivo(valor, porDefecto) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
}

function configuracion() {
    return {
        habilitado: process.env.RESUMEN_IA_HABILITADO === 'true',
        expresion: process.env.RESUMEN_IA_CRON?.trim() || '*/2 * * * *',
        lote: enteroPositivo(process.env.RESUMEN_IA_LOTE, 5),
        maxIntentos: enteroPositivo(process.env.RESUMEN_IA_MAX_INTENTOS, 3),
    };
}

let ejecutando = false;

// una ejecucion por vez: si la anterior todavia no termino, esta se saltea
async function ejecutarUnaVez({ lote, maxIntentos }) {
    if (ejecutando) return null;
    ejecutando = true;

    try {
        const resultado = await resumenesService.procesarLote({ lote, maxIntentos });
        const total = Object.values(resultado).reduce((suma, n) => suma + n, 0);
        if (total > 0) console.log('[resumenes] lote procesado:', resultado);
        return resultado;
    } catch (error) {
        console.error('[resumenes] fallo la ejecucion:', error.message);
        return null;
    } finally {
        ejecutando = false;
    }
}

function iniciar() {
    const config = configuracion();

    if (!config.habilitado) {
        console.log('[resumenes] proceso desactivado (RESUMEN_IA_HABILITADO no es "true")');
        return null;
    }

    if (!cron.validate(config.expresion)) {
        console.error(`[resumenes] RESUMEN_IA_CRON no es una expresión válida: "${config.expresion}"`);
        return null;
    }

    console.log(`[resumenes] proceso activo (${config.expresion}, lote de ${config.lote})`);
    return cron.schedule(config.expresion, () => ejecutarUnaVez(config));
}

module.exports = { iniciar, ejecutarUnaVez, configuracion };
