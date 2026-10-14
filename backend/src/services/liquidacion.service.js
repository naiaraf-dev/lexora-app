const fail = (mensaje) => { throw Object.assign(new Error(mensaje), { status: 400 }); };
const money = n => Number(Number(n).toFixed(2));
// El frontend calcula los intereses con CPACF. Este endpoint verifica y
// presenta los importes, sin inventar una fórmula para tasas heterogéneas.
function previsualizar(d) {
 const capital = Number(d.capital ?? d.monto_base);
 const intereses = Number(d.intereses);
 if (!Number.isFinite(capital) || capital < 0) fail('capital/monto_base inválido');
 if (!Number.isFinite(intereses) || intereses < 0) fail('intereses inválidos');
 if (!Number.isInteger(Number(d.tasa)) || Number(d.tasa) <= 0) fail('tasa inválida');
 if (d.tasa_valor === undefined || !Number.isFinite(Number(d.tasa_valor))) fail('tasa_valor inválido');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha_desde)) ||
     !/^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha_hasta))) fail('Fechas YYYY-MM-DD obligatorias');
 const desde = new Date(`${d.fecha_desde}T00:00:00Z`);
 const hasta = new Date(`${d.fecha_hasta}T00:00:00Z`);
 if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) ||
    desde.toISOString().slice(0,10) !== d.fecha_desde ||
    hasta.toISOString().slice(0,10) !== d.fecha_hasta || desde > hasta) fail('Rango de fechas inválido');
 const total = money(capital + intereses);
 if (d.total !== undefined && money(d.total) !== total) fail('total no coincide con capital + intereses');
 return { capital: money(capital), intereses: money(intereses), total,
   tasa: Number(d.tasa), tasa_valor: Number(d.tasa_valor),
   fecha_desde: d.fecha_desde, fecha_hasta: d.fecha_hasta,
   trazabilidad: { origen: 'frontend', formula: 'capital + intereses recibidos',
     calculadoEnBackend: false } };
}
module.exports = { previsualizar };
