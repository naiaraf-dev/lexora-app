const { sql } = require('../config/db');
const { request } = require('./previsiones.repository');

const clienteNombre = `LTRIM(RTRIM(CONCAT(c.nombre, ' ', c.apellido)))`;

// Liquidaciones activas (las anuladas tienen activo = 0), con su desglose.
async function getLiquidaciones(prevision = null, tx = null) {
 const r = await request(tx);
 if (prevision !== null) r.input('prevision', sql.Int, prevision);
 const out = await r.query(`SELECT l.*, CONVERT(VARCHAR(50), l.total) AS totalExacto,
   el.nombre AS estadoNombre, t.nombre AS tasaNombre,
   p.expediente AS expedienteId, e.fecha_creacion AS expedienteFechaCreacion,
   ${clienteNombre} AS clienteNombre
   FROM liquidacion l
   JOIN prevision p ON p.id = l.prevision AND p.activo = 1
   JOIN expediente e ON e.id = p.expediente
   LEFT JOIN cliente c ON c.id = e.cliente
   JOIN estadoliquidacion el ON el.id = l.estado_liquidacion
   JOIN tasa t ON t.id = l.tasa
   WHERE l.activo = 1 ${prevision !== null ? 'AND l.prevision = @prevision' : ''}
   ORDER BY l.fecha_liquidacion DESC, l.id DESC`);
 return out.recordset;
}

// Pagos activos, con el comprobante (documento) si lo tienen.
async function getPagos(prevision = null, tx = null) {
 const r = await request(tx);
 if (prevision !== null) r.input('prevision', sql.Int, prevision);
 const out = await r.query(`SELECT pg.*, mp.nombre AS medioPagoNombre,
   d.nombre_archivo AS documentoNombre,
   p.expediente AS expedienteId, e.fecha_creacion AS expedienteFechaCreacion,
   ${clienteNombre} AS clienteNombre
   FROM pagoprevision pg
   JOIN prevision p ON p.id = pg.prevision AND p.activo = 1
   JOIN expediente e ON e.id = p.expediente
   LEFT JOIN cliente c ON c.id = e.cliente
   JOIN mediopago mp ON mp.id = pg.medio_pago
   LEFT JOIN documento d ON d.id = pg.documento
   WHERE pg.activo = 1 ${prevision !== null ? 'AND pg.prevision = @prevision' : ''}
   ORDER BY pg.fecha_pago DESC, pg.id DESC`);
 return out.recordset;
}

async function getImpulsos(prevision, tx = null) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .query(`SELECT i.*, d.nombre_archivo AS documentoNombre
      FROM impulsoprevision i
      LEFT JOIN documento d ON d.id = i.documento
      WHERE i.prevision = @prevision AND i.activo = 1
      ORDER BY i.fecha DESC, i.id DESC`);
 return out.recordset;
}

async function vigente(prevision, tx) {
 const r = await request(tx);
 const out = await r.input('id', sql.Int, prevision)
  .query(`SELECT *, CONVERT(VARCHAR(50), total) AS totalExacto
      FROM liquidacion WITH (UPDLOCK, HOLDLOCK)
      WHERE prevision = @id AND vigente = 1 AND activo = 1`);
 return out.recordset[0] ?? null;
}

async function totalPagado(prevision, tx) {
 const r = await request(tx);
 const out = await r.input('id', sql.Int, prevision)
  .query('SELECT COALESCE(SUM(monto), 0) AS total FROM pagoprevision WHERE prevision = @id AND activo = 1');
 return Number(out.recordset[0].total);
}

// SUM devuelve un DECIMAL, enviado como cadena para evitar pérdida de
// precisión al compararlo en el service. Los pagos anulados (activo = 0) no cuentan.
async function resumenPagos(prevision, tx = null) {
    const r = await request(tx);
    const out = await r.input('prevision', sql.Int, prevision).query(`
        SELECT COUNT(*) AS cantidadPagos,
               CONVERT(VARCHAR(50),
                 COALESCE(SUM(CAST(monto AS DECIMAL(38,2))), CAST(0 AS DECIMAL(38,2))))
               AS totalPagadoExacto
        FROM pagoprevision
        WHERE prevision = @prevision AND activo = 1
    `);
    return out.recordset[0];
}

async function contarImpulsos(prevision, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .query('SELECT COUNT(*) AS n FROM impulsoprevision WHERE prevision = @prevision AND activo = 1');
 return out.recordset[0].n;
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
        .query(`SELECT pg.*, mp.nombre AS medioPagoNombre, d.nombre_archivo AS documentoNombre
                FROM pagoprevision pg
                JOIN mediopago mp ON mp.id = pg.medio_pago
                LEFT JOIN documento d ON d.id = pg.documento
                WHERE pg.prevision = @prevision AND pg.id = @pagoId AND pg.activo = 1`);
    return out.recordset[0] ?? null;
}

async function crearLiquidacion(d, usuarioId, tx) {
 const r = await request(tx);
 // Índice filtrado: primero desactiva la anterior, luego inserta la vigente.
 await r.input('id', sql.Int, d.prevision)
  .query('UPDATE liquidacion SET vigente = 0 WHERE prevision = @id AND vigente = 1');
 const insert = await request(tx);
 // numero: correlativo por previsión (cuenta también las anuladas, para no repetir números).
 const out = await insert
  .input('prevision', sql.Int, d.prevision)
  .input('fecha_liquidacion', sql.Date, d.fecha_liquidacion ?? null)
  .input('fecha_desde', sql.Date, d.fecha_desde ?? null)
  .input('fecha_hasta', sql.Date, d.fecha_hasta ?? null)
  .input('tasa', sql.Int, d.tasa)
  .input('tasa_valor', sql.Decimal(9,4), d.tasa_valor ?? null)
  .input('capital', sql.Decimal(18,2), d.capital)
  .input('intereses', sql.Decimal(18,2), d.intereses)
  .input('otros', sql.Decimal(18,2), d.otros)
  .input('total', sql.Decimal(18,2), d.total)
  .input('estado', sql.Int, d.estado_liquidacion)
  .input('detalle', sql.NVarChar(sql.MAX), d.detalle_calculo ?? null)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`INSERT INTO liquidacion
    (prevision, numero, fecha_liquidacion, fecha_desde, fecha_hasta, tasa, tasa_valor,
     capital, intereses, otros, total, estado_liquidacion, vigente, detalle_calculo, observaciones,
     usuario_creacion, usuario_ultima_modificacion)
     OUTPUT INSERTED.id
     SELECT @prevision, COALESCE(MAX(numero), 0) + 1, @fecha_liquidacion, @fecha_desde, @fecha_hasta,
     @tasa, @tasa_valor, @capital, @intereses, @otros, @total, @estado, 1, @detalle, @observaciones,
     @usuario, @usuario
     FROM liquidacion WHERE prevision = @prevision`);
 return out.recordset[0].id;
}

async function cambiarEstadoLiquidacion(prevision, liqId, estado, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .input('liqId', sql.Int, liqId).input('estado', sql.Int, estado)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`UPDATE liquidacion SET estado_liquidacion = @estado,
       usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
       OUTPUT INSERTED.id WHERE id = @liqId AND prevision = @prevision AND vigente = 1 AND activo = 1`);
 return out.recordset.length > 0;
}

async function crearPago(d, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, d.prevision)
  .input('fecha_pago', sql.Date, d.fecha_pago)
  .input('monto', sql.Decimal(18,2), d.monto)
  .input('pagador', sql.VarChar(20), d.pagador)
  .input('pagador_detalle', sql.NVarChar(200), d.pagador_detalle ?? null)
  .input('medio_pago', sql.Int, d.medio_pago)
  .input('referencia', sql.NVarChar(200), d.referencia ?? null)
  .input('documento', sql.Int, d.documento ?? null)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`INSERT INTO pagoprevision
   (prevision, fecha_pago, monto, pagador, pagador_detalle, medio_pago,
    referencia, documento, observaciones, usuario_creacion, usuario_ultima_modificacion)
   OUTPUT INSERTED.id VALUES (@prevision, @fecha_pago, @monto, @pagador,
    @pagador_detalle, @medio_pago, @referencia, @documento, @observaciones, @usuario, @usuario)`);
 return out.recordset[0].id;
}

async function crearImpulso(d, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, d.prevision)
  .input('fecha', sql.Date, d.fecha)
  .input('monto', sql.Decimal(18,2), d.monto)
  .input('es_diferencia', sql.Bit, d.es_diferencia)
  .input('documento', sql.Int, d.documento ?? null)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`INSERT INTO impulsoprevision
   (prevision, fecha, monto, es_diferencia, documento, observaciones,
    usuario_creacion, usuario_ultima_modificacion)
   OUTPUT INSERTED.id VALUES (@prevision, @fecha, @monto, @es_diferencia, @documento,
    @observaciones, @usuario, @usuario)`);
 return out.recordset[0].id;
}

// Acreditaciones, con el estado de la tarea de notificación (estado_tarea 2 = Cumplido).
async function getAcreditaciones(prevision, tx = null) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .query(`SELECT a.*, d.nombre_archivo AS documentoNombre, t.estado_tarea AS tareaEstado
      FROM acreditacion a
      LEFT JOIN documento d ON d.id = a.documento
      LEFT JOIN tarea t ON t.id = a.tarea
      WHERE a.prevision = @prevision AND a.activo = 1
      ORDER BY a.fecha DESC, a.id DESC`);
 return out.recordset;
}

// Hay una acreditación que ordenó notificar y su tarea todavía no está Cumplida.
async function notificacionPendiente(prevision, tx = null) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .query(`SELECT TOP 1 1 AS hay FROM acreditacion a JOIN tarea t ON t.id = a.tarea
      WHERE a.prevision = @prevision AND a.activo = 1 AND a.ordena_notificar = 1 AND t.estado_tarea <> 2`);
 return out.recordset.length > 0;
}

async function crearAcreditacion(d, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, d.prevision)
  .input('fecha', sql.Date, d.fecha)
  .input('documento', sql.Int, d.documento ?? null)
  .input('ordena_notificar', sql.Bit, d.ordena_notificar)
  .input('tarea', sql.Int, d.tarea ?? null)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`INSERT INTO acreditacion (prevision, fecha, documento, ordena_notificar, tarea,
    usuario_creacion, usuario_ultima_modificacion)
   OUTPUT INSERTED.id VALUES (@prevision, @fecha, @documento, @ordena_notificar, @tarea, @usuario, @usuario)`);
 return out.recordset[0].id;
}

// Intimaciones activas, la más reciente primero (la que cuenta para marcas y alertas).
async function getIntimaciones(prevision, tx = null) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision)
  .query(`SELECT i.*, d.nombre_archivo AS documentoNombre
      FROM intimacionprevision i
      LEFT JOIN documento d ON d.id = i.documento
      WHERE i.prevision = @prevision AND i.activo = 1
      ORDER BY i.fecha DESC, i.id DESC`);
 return out.recordset;
}

async function crearIntimacion(d, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, d.prevision)
  .input('fecha', sql.Date, d.fecha)
  .input('fecha_vencimiento', sql.Date, d.fecha_vencimiento)
  .input('apercibimiento', sql.NVarChar(100), d.apercibimiento ?? null)
  .input('documento', sql.Int, d.documento ?? null)
  .input('tarea', sql.Int, d.tarea ?? null)
  .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`INSERT INTO intimacionprevision (prevision, fecha, fecha_vencimiento, apercibimiento,
    documento, tarea, observaciones, usuario_creacion, usuario_ultima_modificacion)
   OUTPUT INSERTED.id VALUES (@prevision, @fecha, @fecha_vencimiento, @apercibimiento,
    @documento, @tarea, @observaciones, @usuario, @usuario)`);
 return out.recordset[0].id;
}

// ---------- Anulaciones (sección 1: pagos y liquidaciones no se editan, se anulan) ----------

// Devuelve el pago anulado, o null si no existía o ya estaba anulado.
async function anularPago(prevision, pagoId, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision).input('pagoId', sql.Int, pagoId)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`UPDATE pagoprevision SET activo = 0,
      usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
    OUTPUT INSERTED.id, INSERTED.monto, INSERTED.fecha_pago
    WHERE id = @pagoId AND prevision = @prevision AND activo = 1`);
 return out.recordset[0] ?? null;
}

// Anula la liquidación. Si era la vigente, vuelve a quedar vigente la anterior activa (la de mayor número).
async function anularLiquidacion(prevision, liqId, usuarioId, tx) {
 const r = await request(tx);
 const out = await r.input('prevision', sql.Int, prevision).input('liqId', sql.Int, liqId)
  .input('usuario', sql.Int, usuarioId ?? null)
  .query(`UPDATE liquidacion SET activo = 0, vigente = 0,
      usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
    OUTPUT DELETED.id, DELETED.numero, DELETED.vigente, DELETED.total
    WHERE id = @liqId AND prevision = @prevision AND activo = 1`);
 const anulada = out.recordset[0] ?? null;
 if (anulada?.vigente) {
  const r2 = await request(tx);
  await r2.input('prevision', sql.Int, prevision).query(`
    UPDATE liquidacion SET vigente = 1
    WHERE id = (SELECT TOP 1 id FROM liquidacion WHERE prevision = @prevision AND activo = 1
                ORDER BY numero DESC, id DESC)`);
 }
 return anulada;
}

module.exports = { getLiquidaciones, getPagos, getImpulsos, vigente, totalPagado, anularPago, anularLiquidacion,
 crearLiquidacion, cambiarEstadoLiquidacion, crearPago, crearImpulso, contarImpulsos,
 resumenPagos, existeMedioPago, getMediosPago, getPagoById,
 getAcreditaciones, notificacionPendiente, crearAcreditacion, getIntimaciones, crearIntimacion };
