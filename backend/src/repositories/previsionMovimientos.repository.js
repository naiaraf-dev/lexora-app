const { sql } = require('../config/db');
const { request } = require('./previsiones.repository');

async function getLiquidaciones(prevision = null, tx = null) {
 const r = await request(tx);
 if (prevision !== null) r.input('prevision', sql.Int, prevision);
 const out = await r.query(`SELECT l.*, CONVERT(VARCHAR(50), l.total) AS totalExacto,
   el.nombre AS estadoNombre, t.nombre AS tasaNombre,
   p.expediente AS expedienteId, e.fecha_creacion AS expedienteFechaCreacion,
   c.nombre + ' ' + c.apellido AS clienteNombre
   FROM liquidacion l
   JOIN prevision p ON p.id = l.prevision
   JOIN expediente e ON e.id = p.expediente
   LEFT JOIN cliente c ON c.id = e.cliente
   JOIN estadoliquidacion el ON el.id = l.estado_liquidacion
   JOIN tasa t ON t.id = l.tasa
   ${prevision !== null ? 'WHERE l.prevision = @prevision' : ''}
   ORDER BY l.fecha_liquidacion DESC, l.id DESC`);
 return out.recordset;
}
async function getPagos(prevision = null, tx = null) {
 const r = await request(tx);
 if (prevision !== null) r.input('prevision', sql.Int, prevision);
 const out = await r.query(`SELECT pg.*, mp.nombre AS medioPagoNombre,
   p.expediente AS expedienteId, e.fecha_creacion AS expedienteFechaCreacion,
   c.nombre + ' ' + c.apellido AS clienteNombre
   FROM pagoprevision pg
   JOIN prevision p ON p.id = pg.prevision
   JOIN expediente e ON e.id = p.expediente
   LEFT JOIN cliente c ON c.id = e.cliente
   JOIN mediopago mp ON mp.id = pg.medio_pago
   ${prevision !== null ? 'WHERE pg.prevision = @prevision' : ''}
   ORDER BY pg.fecha_pago DESC, pg.id DESC`);
 return out.recordset;
}
async function vigente(prevision, tx) {
 const r = await request(tx);
 const out = await r.input('id', sql.Int, prevision)
  .query(`SELECT *, CONVERT(VARCHAR(50), total) AS totalExacto
      FROM liquidacion WITH (UPDLOCK, HOLDLOCK)
      WHERE prevision = @id AND vigente = 1`);
 return out.recordset[0] ?? null;
}
async function totalPagado(prevision, tx) {
 const r = await request(tx);
 const out = await r.input('id', sql.Int, prevision)
  .query('SELECT COALESCE(SUM(monto), 0) AS total FROM pagoprevision WHERE prevision = @id');
 return Number(out.recordset[0].total);
}
// SUM devuelve un DECIMAL, enviado como cadena para evitar pérdida de
// precisión al compararlo en el service. No incluye anulaciones porque la
// tabla pagoprevision actual no tiene columna activo.
async function resumenPagos(prevision, tx = null) {
    const r = await request(tx);
    const out = await r.input('prevision', sql.Int, prevision).query(`
        SELECT COUNT(*) AS cantidadPagos,
               CONVERT(VARCHAR(50),
                 COALESCE(SUM(CAST(monto AS DECIMAL(38,2))), CAST(0 AS DECIMAL(38,2))))
               AS totalPagadoExacto
        FROM pagoprevision
        WHERE prevision = @prevision
    `);
    return out.recordset[0];
}

async function existeMedioPago(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id)
        .query('SELECT id FROM mediopago WHERE id = @id');
    return out.recordset.length > 0;
}

async function getMediosPago() {
    const r = await request();
    const out = await r.query('SELECT id, nombre FROM mediopago ORDER BY id');
    return out.recordset;
}

async function getPagoById(previsionId, pagoId, tx = null) {
    const r = await request(tx);
    const out = await r.input('prevision', sql.Int, previsionId)
        .input('pagoId', sql.Int, pagoId)
        .query(`SELECT pg.*, mp.nombre AS medioPagoNombre
                FROM pagoprevision pg
                JOIN mediopago mp ON mp.id = pg.medio_pago
                WHERE pg.prevision = @prevision AND pg.id = @pagoId`);
    return out.recordset[0] ?? null;
}

async function crearLiquidacion(d, tx) {
 const r = await request(tx);
 // Índice filtrado: primero desactiva la anterior, luego inserta la vigente.
 await r.input('id', sql.Int, d.prevision)
  .query('UPDATE liquidacion SET vigente = 0 WHERE prevision = @id AND vigente = 1');
 const insert = await request(tx);
 const out = await insert
  .input('prevision', sql.Int, d.prevision)
  .input('fecha_liquidacion', sql.Date, d.fecha_liquidacion ?? null)
  .input('fecha_desde', sql.Date, d.fecha_desde ?? null)
  .input('fecha_hasta', sql.Date, d.fecha_hasta ?? null)
  .input('tasa', sql.Int, d.tasa)
  .input('tasa_valor', sql.Decimal(9,4), d.tasa_valor)
  .input('total', sql.Decimal(18,2), d.total)
  .input('estado', sql.Int, d.estado_liquidacion)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .query(`INSERT INTO liquidacion
    (prevision, fecha_liquidacion, fecha_desde, fecha_hasta, tasa, tasa_valor,
     total, estado_liquidacion, vigente, observaciones)
     OUTPUT INSERTED.id VALUES
    (@prevision, @fecha_liquidacion, @fecha_desde, @fecha_hasta, @tasa,
     @tasa_valor, @total, @estado, 1, @observaciones)`);
 return out.recordset[0].id;
}
async function cambiarEstadoLiquidacion(prevision, liqId, estado, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .input('liqId', sql.Int, liqId).input('estado', sql.Int, estado)
  .query(`UPDATE liquidacion SET estado_liquidacion = @estado
       OUTPUT INSERTED.id WHERE id = @liqId AND prevision = @prevision AND vigente = 1`);
 return out.recordset.length > 0;
}
async function crearPago(d, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, d.prevision)
  .input('fecha_pago', sql.Date, d.fecha_pago)
  .input('monto', sql.Decimal(18,2), d.monto)
  .input('pagador', sql.VarChar(20), d.pagador)
  .input('pagador_detalle', sql.NVarChar(200), d.pagador_detalle ?? null)
  .input('medio_pago', sql.Int, d.medio_pago)
  .input('referencia', sql.NVarChar(200), d.referencia ?? null)
  .input('storage_key', sql.VarChar(500), d.storage_key ?? null)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .query(`INSERT INTO pagoprevision
   (prevision, fecha_pago, monto, pagador, pagador_detalle, medio_pago,
    referencia, storage_key, observaciones)
   OUTPUT INSERTED.id VALUES (@prevision, @fecha_pago, @monto, @pagador,
    @pagador_detalle, @medio_pago, @referencia, @storage_key, @observaciones)`);
 return out.recordset[0].id;
}
module.exports = { getLiquidaciones, getPagos, vigente, totalPagado,
 crearLiquidacion, cambiarEstadoLiquidacion, crearPago, resumenPagos,
 existeMedioPago, getMediosPago, getPagoById };
