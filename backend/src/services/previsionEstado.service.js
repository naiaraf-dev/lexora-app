const ESTADO = Object.freeze({
 REGISTRADO: 1, EN_ANALISIS: 2, CON_PREVISION: 3,
 LISTO: 4, IMPULSADO: 5, PAGADO: 6,
 ACREDITADO: 7, CERRADO: 8
});
const LIQUIDACION_APROBADA = 4;
function exigirEditable(prevision) {
 if (prevision.estado_prevision === ESTADO.CERRADO)
  throw Object.assign(new Error('La previsión está cerrada'), {status:409});
}
// Sin tablas de impulso/acreditación no se fuerzan esos estados.
async function recalcular(id, previsionRepo, movimientosRepo, tx) {
 const p = await previsionRepo.getById(id, tx);
 if (!p || p.estado_prevision === ESTADO.CERRADO ||
     p.estado_prevision === ESTADO.ACREDITADO) return;
 const liq = await movimientosRepo.vigente(id, tx);
 const totalPagado = await movimientosRepo.totalPagado(id, tx);
 let siguiente;
 if (liq && liq.total !== null && totalPagado >= Number(liq.total) && totalPagado > 0)
   siguiente = ESTADO.PAGADO;
 else if (liq && liq.estado_liquidacion === LIQUIDACION_APROBADA &&
          p.fecha_provisionado && totalPagado < Number(liq.total))
   siguiente = ESTADO.LISTO;
 else if (p.fecha_provisionado)
   siguiente = ESTADO.CON_PREVISION;
 else siguiente = ESTADO.REGISTRADO;
 if (siguiente !== p.estado_prevision) await previsionRepo.setEstado(id, siguiente, tx);
}
module.exports = { ESTADO, LIQUIDACION_APROBADA, exigirEditable, recalcular };
