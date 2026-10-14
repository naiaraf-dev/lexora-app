const ESTADO = Object.freeze({
    REGISTRADO: 1,
    EN_ANALISIS: 2,
    CON_PREVISION: 3,
    LISTO: 4,
    IMPULSADO: 5,
    PAGADO: 6,
    ACREDITADO: 7,
    CERRADO: 8
});

const LIQUIDACION_APROBADA = 4;

function exigirEditable(prevision) {
    if ([ESTADO.ACREDITADO, ESTADO.CERRADO].includes(prevision.estado_prevision)) {
        throw Object.assign(new Error('No se puede modificar una previsión acreditada o cerrada'), {
            status: 409
        });
    }
}

// Usar enteros en centavos para no comparar importes decimales con punto flotante.
// Los valores precisos provienen de CAST(DECIMAL AS VARCHAR) en SQL Server.
function aCentavos(valor) {
    const cadena = String(valor).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(cadena)) {
        throw new Error('Importe monetario inválido recibido de la base de datos');
    }
    const [entero, decimales = ''] = cadena.split('.');
    return BigInt(entero) * 100n + BigInt(decimales.padEnd(2, '0'));
}

// Sin las tablas de impulso y acreditación no se generan estados 5, 7 ni 8.
async function recalcular(previsionId, previsionRepo, movimientosRepo, tx) {
    const p = await previsionRepo.getById(previsionId, tx);
    if (!p || [ESTADO.CERRADO, ESTADO.ACREDITADO].includes(p.estado_prevision)) return;

    const liq = await movimientosRepo.vigente(previsionId, tx);
    const resumen = await movimientosRepo.resumenPagos(previsionId, tx);
    const pagado = aCentavos(resumen.totalPagadoExacto);
    const firme = liq && liq.estado_liquidacion === LIQUIDACION_APROBADA && liq.total !== null;

    let siguiente;
    if (!p.fecha_provisionado) {
        siguiente = ESTADO.REGISTRADO;
    } else if (firme) {
        const total = aCentavos(liq.totalExacto);
        if (total > 0n && pagado >= total) {
            siguiente = ESTADO.PAGADO;
        } else if (p.modo === 'activo') {
            // No hay impulso en esta versión. Queda listo para impulsar
            // aun cuando ya existan pagos parciales.
            siguiente = ESTADO.LISTO;
        } else {
            siguiente = ESTADO.CON_PREVISION;
        }
    } else {
        // En seguimiento es posible registrar cobros sin liquidación firme.
        // El monto previsto no acredita la cancelación de la obligación.
        siguiente = ESTADO.CON_PREVISION;
    }

    if (siguiente !== p.estado_prevision) {
        await previsionRepo.setEstado(previsionId, siguiente, tx);
    }
}

module.exports = {
    ESTADO,
    LIQUIDACION_APROBADA,
    exigirEditable,
    recalcular,
    aCentavos
};
