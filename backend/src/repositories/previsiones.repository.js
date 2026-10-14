const { sql, conectarBD } = require('../config/db');

async function request(tx) {
    return tx ? new sql.Request(tx) : (await conectarBD()).request();
}

function error(status, mensaje) { return Object.assign(new Error(mensaje), { status, mensaje }); }

const joins = `
 FROM prevision p
 JOIN expediente e ON e.id = p.expediente
 LEFT JOIN causa ca ON ca.id = e.causa_id AND ca.activo = 1
 LEFT JOIN cliente c ON c.id = e.cliente
 JOIN estadoprevision ep ON ep.id = p.estado_prevision
 JOIN tasa t ON t.id = p.tasa
`;
const select = `p.*, e.caratula, e.fecha_creacion AS expedienteFechaCreacion,
 e.numero_expediente_judicial AS expedienteJudicial, e.cliente AS clienteId,
 c.nombre + ' ' + c.apellido AS clienteNombre,
 ep.nombre AS estadoNombre, t.nombre AS tasaNombre`;

async function getAll(f = {}) {
    const r = await request();
    const where = [];
    const add = (key, type, val, condition) => {
        if (val !== undefined && val !== null && val !== '') {
            r.input(key, type, val);
            where.push(condition);
        }
    };
    add('expedienteId', sql.Int, f.expedienteId,
        'p.expediente = COALESCE(ca.expediente_principal_id, e.id) AND p.expediente = @expedienteId');
    // Para las vistas de causas se resuelve el principal desde el service antes de llamar a getAll.
    add('expediente', sql.NVarChar(200), f.expediente ? `%${f.expediente}%` : null,
        `(CONCAT('EXP-', YEAR(e.fecha_creacion), '-', e.id) LIKE @expediente OR e.numero_expediente_judicial LIKE @expediente OR e.caratula LIKE @expediente)`);
    add('cliente', sql.NVarChar(200), f.cliente ? `%${f.cliente}%` : null,
        `(c.nombre + ' ' + c.apellido LIKE @cliente)`);
    add('clienteId', sql.Int, f.clienteId, 'e.cliente = @clienteId');
    add('estado', sql.Int, f.estado, 'p.estado_prevision = @estado');
    add('modo', sql.VarChar(20), f.modo, 'p.modo = @modo');
    const pagination = ' OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY';
    r.input('offset', sql.Int, (f.pagina - 1) * f.pageSize);
    r.input('pageSize', sql.Int, f.pageSize);
    const filter = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const data = await r.query(`SELECT ${select}, COUNT(*) OVER() AS totalRegistros
        ${joins} ${filter} ORDER BY p.id DESC ${pagination}`);
    // COUNT OVER no devuelve total si la página está fuera del rango.
    const countReq = await request();
    for (const [k, v, type] of [
        ['expedienteId', f.expedienteId, sql.Int], ['expediente', f.expediente ? `%${f.expediente}%` : null, sql.NVarChar(200)],
        ['cliente', f.cliente ? `%${f.cliente}%` : null, sql.NVarChar(200)], ['clienteId', f.clienteId, sql.Int],
        ['estado', f.estado, sql.Int], ['modo', f.modo, sql.VarChar(20)]
    ]) if (v !== undefined && v !== null && v !== '') countReq.input(k, type, v);
    const count = await countReq.query(`SELECT COUNT(*) AS total ${joins} ${filter}`);
    return { rows: data.recordset, total: count.recordset[0].total };
}

async function getById(id, tx = null) {
    const r = await request(tx);
    const result = await r.input('id', sql.Int, id)
        .query(`SELECT ${select} ${joins} WHERE p.id = @id`);
    return result.recordset[0] ?? null;
}

async function getExpediente(id, tx = null) {
    const r = await request(tx);
    const result = await r.input('id', sql.Int, id).query(`
       SELECT e.id, e.activo, e.tipo_expediente, e.estado_expediente,
              e.causa_id, e.contraparte, ca.expediente_principal_id,
              e.cliente, c.nombre + ' ' + c.apellido AS clienteNombre
       FROM expediente e
       LEFT JOIN causa ca ON ca.id = e.causa_id AND ca.activo = 1
       LEFT JOIN cliente c ON c.id = e.cliente
       WHERE e.id = @id`);
    return result.recordset[0] ?? null;
}

async function getHabilitacion(expediente, tx = null) {
    // No inventar el esquema: se aplica únicamente si la columna está instalada.
    const r = await request(tx);
    const result = await r.input('tipo', sql.Int, expediente.tipo_expediente)
        .input('estado', sql.Int, expediente.estado_expediente).query(`
          IF COL_LENGTH('dbo.tipoestadoexpediente', 'habilita_prevision') IS NULL
            SELECT CAST(NULL AS BIT) AS habilitada;
          ELSE
            EXEC sp_executesql
              N'SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.tipoestadoexpediente
                WHERE tipo_expediente = @tipo AND estado_expediente = @estado
                  AND habilita_prevision = 1) THEN 1 ELSE 0 END AS BIT) AS habilitada',
              N'@tipo INT, @estado INT', @tipo = @tipo, @estado = @estado;
        `);
    return result.recordset?.[0]?.habilitada ?? null;
}

async function create(d, tx) {
    const r = await request(tx);
    const out = await r
      .input('expediente', sql.Int, d.expediente)
      .input('estado_prevision', sql.Int, 1)
      .input('modo', sql.VarChar(20), d.modo)
      .input('obligado', sql.VarChar(20), d.obligado)
      .input('obligado_detalle', sql.VarChar(200), d.obligado_detalle ?? null)
      .input('fecha_resolucion', sql.Date, d.fecha_resolucion ?? null)
      .input('fecha_firmeza', sql.Date, d.fecha_firmeza ?? null)
      .input('fecha_estimada_pago', sql.Date, d.fecha_estimada_pago ?? null)
      .input('ejercicio', sql.Int, d.ejercicio ?? null)
      .input('monto_base', sql.Decimal(18,2), d.monto_base ?? null)
      .input('tasa', sql.Int, d.tasa)
      .input('tasa_valor', sql.Decimal(9,4), d.tasa_valor)
      .input('monto_previsto', sql.Decimal(18,2), d.monto_previsto ?? null)
      .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
      .query(`INSERT INTO prevision (expediente, estado_prevision, modo, obligado,
         obligado_detalle, fecha_resolucion, fecha_firmeza, fecha_estimada_pago,
         ejercicio, monto_base, tasa, tasa_valor, monto_previsto, observaciones)
         OUTPUT INSERTED.id VALUES (@expediente, @estado_prevision, @modo, @obligado,
         @obligado_detalle, @fecha_resolucion, @fecha_firmeza, @fecha_estimada_pago,
         @ejercicio, @monto_base, @tasa, @tasa_valor, @monto_previsto, @observaciones)`);
    return out.recordset[0].id;
}

const editables = {
    modo: sql.VarChar(20), obligado: sql.VarChar(20), obligado_detalle: sql.VarChar(200),
    fecha_resolucion: sql.Date, fecha_firmeza: sql.Date,
    fecha_estimada_pago: sql.Date, ejercicio: sql.Int,
    monto_base: sql.Decimal(18,2), tasa: sql.Int, tasa_valor: sql.Decimal(9,4),
    monto_previsto: sql.Decimal(18,2), observaciones: sql.NVarChar(sql.MAX)
};

async function update(id, d, tx) {
    const r = await request(tx);
    r.input('id', sql.Int, id);
    const sets = [];
    for (const [key, type] of Object.entries(editables)) {
        if (d[key] !== undefined) {
            r.input(key, type, d[key]);
            sets.push(`${key} = @${key}`);
        }
    }
    if (!sets.length) return;
    await r.query(`UPDATE prevision SET ${sets.join(', ')} WHERE id = @id`);
}

async function setEstado(id, estado, tx) {
    const r = await request(tx);
    await r.input('id', sql.Int, id).input('estado', sql.Int, estado)
        .query('UPDATE prevision SET estado_prevision = @estado WHERE id = @id');
}
async function registrar(id, fecha, tx) {
    const r = await request(tx);
    await r.input('id', sql.Int, id).input('fecha', sql.Date, fecha)
        .query('UPDATE prevision SET fecha_provisionado = @fecha WHERE id = @id');
}
async function items(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query(`
       SELECT i.*, cp.nombre AS conceptoNombre, t.nombre AS tasaNombre
       FROM prevision_item i
       JOIN conceptoprevision cp ON cp.id = i.concepto_prevision
       LEFT JOIN tasa t ON t.id = i.tasa
       WHERE i.prevision = @id ORDER BY i.id`);
    return out.recordset;
}
async function replaceItems(id, itemsArray, tx) {
    const del = await request(tx);
    await del.input('id', sql.Int, id).query('DELETE FROM prevision_item WHERE prevision = @id');
    for (const item of itemsArray) {
        const r = await request(tx);
        await r.input('prevision', sql.Int, id)
         .input('concepto', sql.Int, item.concepto_prevision)
         .input('base', sql.Decimal(18,2), item.monto_base)
         .input('tasa', sql.Int, item.tasa ?? null)
         .input('tasaValor', sql.Decimal(9,4), item.tasa_valor)
         .input('previsto', sql.Decimal(18,2), item.monto_previsto ?? null)
         .input('instancia', sql.NVarChar(50), item.instancia ?? null)
         .input('observaciones', sql.NVarChar(sql.MAX), item.observaciones ?? null)
         .query(`INSERT INTO prevision_item
            (prevision, concepto_prevision, monto_base, tasa, tasa_valor,
             monto_previsto, instancia, observaciones)
            VALUES (@prevision, @concepto, @base, @tasa, @tasaValor,
              @previsto, @instancia, @observaciones)`);
    }
}
module.exports = { request, getAll, getById, getExpediente, getHabilitacion,
    create, update, setEstado, registrar, items, replaceItems, error };
