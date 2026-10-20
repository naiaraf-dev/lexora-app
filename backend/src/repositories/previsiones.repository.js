const { sql, conectarBD } = require('../config/db');

async function request(tx) {
    return tx ? new sql.Request(tx) : (await conectarBD()).request();
}

function error(status, mensaje) { return Object.assign(new Error(mensaje), { status, mensaje }); }

// CONCAT ignora los NULL: una persona jurídica no tiene apellido y con "+" el nombre quedaría NULL.
const clienteNombre = `LTRIM(RTRIM(CONCAT(c.nombre, ' ', c.apellido)))`;

const joins = `
 FROM prevision p
 JOIN expediente e ON e.id = p.expediente
 LEFT JOIN causa ca ON ca.id = e.causa_id AND ca.activo = 1
 LEFT JOIN cliente c ON c.id = e.cliente
 LEFT JOIN tipoexpediente te ON te.id = e.tipo_expediente
 JOIN estadoprevision ep ON ep.id = p.estado_prevision
 LEFT JOIN tipoobligacion tob ON tob.id = p.tipo_obligacion
 JOIN tasa t ON t.id = p.tasa
 OUTER APPLY (SELECT TOP 1 l.total FROM liquidacion l
              WHERE l.prevision = p.id AND l.vigente = 1 AND l.activo = 1) liq
 OUTER APPLY (SELECT COALESCE(SUM(pg.monto), 0) AS total FROM pagoprevision pg
              WHERE pg.prevision = p.id AND pg.activo = 1) pag
`;
// Saldo (sección 6): total de la liquidación vigente, o el monto previsto si todavía no hay
// liquidación, menos los pagos. Se calcula en SQL con DECIMAL para no perder centavos.
const select = `p.*, e.caratula, e.fecha_creacion AS expedienteFechaCreacion,
 e.numero_expediente_judicial AS expedienteJudicial, e.cliente AS clienteId,
 e.area AS expedienteArea, e.fuero AS expedienteFuero, te.nombre AS tipoExpedienteNombre,
 ${clienteNombre} AS clienteNombre,
 CASE WHEN p.obligado = 'cliente' THEN ${clienteNombre} ELSE p.obligado_detalle END AS obligadoNombre,
 ep.nombre AS estadoNombre, t.nombre AS tasaNombre, tob.nombre AS tipoObligacionNombre,
 liq.total AS totalLiquidacionVigente, pag.total AS totalPagado,
 COALESCE(liq.total, p.monto_previsto) - pag.total AS saldo`;

// Filtros del listado. Se aplican igual a los datos, al conteo y al resumen de las tarjetas.
function aplicarFiltros(r, f) {
    const where = ['p.activo = 1'];
    const add = (key, type, val, condition) => {
        if (val !== undefined && val !== null && val !== '') {
            r.input(key, type, val);
            where.push(condition);
        }
    };
    add('expedienteId', sql.Int, f.expedienteId, 'p.expediente = @expedienteId');
    add('expediente', sql.NVarChar(200), f.expediente ? `%${f.expediente}%` : null,
        `(CONCAT('EXP-', YEAR(e.fecha_creacion), '-', e.id) LIKE @expediente OR e.numero_expediente_judicial LIKE @expediente OR e.caratula LIKE @expediente)`);
    add('cliente', sql.NVarChar(200), f.cliente ? `%${f.cliente}%` : null, `${clienteNombre} LIKE @cliente`);
    add('clienteId', sql.Int, f.clienteId, 'e.cliente = @clienteId');
    add('estado', sql.Int, f.estado, 'p.estado_prevision = @estado');
    add('tipoObligacion', sql.Int, f.tipoObligacion, 'p.tipo_obligacion = @tipoObligacion');
    add('modo', sql.VarChar(20), f.modo, 'p.modo = @modo');
    return ` WHERE ${where.join(' AND ')}`;
}

async function getAll(f = {}) {
    const r = await request();
    const filter = aplicarFiltros(r, f);
    r.input('offset', sql.Int, (f.pagina - 1) * f.pageSize);
    r.input('pageSize', sql.Int, f.pageSize);
    const data = await r.query(`SELECT ${select} ${joins} ${filter}
        ORDER BY p.id DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);

    // Conteo y tarjetas sobre todo el resultado filtrado, no solo la página.
    // Estados: 4 Listo para impulsar, 5 Impulsado, 6 Pagado, 7 Acreditado, 8 Cerrado.
    const r2 = await request();
    const filter2 = aplicarFiltros(r2, f);
    const resumen = await r2.query(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN p.estado_prevision <> 8 THEN 1 ELSE 0 END) AS activas,
        COALESCE(SUM(CASE WHEN p.estado_prevision <> 8 THEN p.monto_previsto END), 0) AS totalPrevisto,
        SUM(CASE WHEN p.estado_prevision IN (4, 5) THEN 1 ELSE 0 END) AS pendientesPago,
        SUM(CASE WHEN p.estado_prevision IN (6, 7, 8) THEN 1 ELSE 0 END) AS pagadas
        ${joins} ${filter2}`);
    const s = resumen.recordset[0];
    return {
        rows: data.recordset,
        total: s.total,
        resumen: {
            activas: s.activas ?? 0,
            totalPrevisto: Number(s.totalPrevisto),
            pendientesPago: s.pendientesPago ?? 0,
            pagadas: s.pagadas ?? 0
        }
    };
}

async function getById(id, tx = null) {
    const r = await request(tx);
    const result = await r.input('id', sql.Int, id)
        .query(`SELECT ${select} ${joins} WHERE p.id = @id AND p.activo = 1`);
    return result.recordset[0] ?? null;
}

// Bloqueo por previsión para serializar pagos, liquidaciones y cambios de estado.
// Se usa dentro de transacciones SERIALIZABLE para evitar pagos concurrentes
// que individualmente entren en el saldo pero conjuntamente lo excedan.
async function bloquear(id, tx) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query(`
        SELECT id FROM prevision WITH (UPDLOCK, HOLDLOCK) WHERE id = @id AND activo = 1
    `);
    return out.recordset.length > 0;
}

async function getExpediente(id, tx = null) {
    const r = await request(tx);
    const result = await r.input('id', sql.Int, id).query(`
       SELECT e.id, e.activo, e.tipo_expediente, e.estado_expediente, e.prioridad,
              e.causa_id, e.contraparte, ca.expediente_principal_id,
              e.cliente, ${clienteNombre} AS clienteNombre
       FROM expediente e
       LEFT JOIN causa ca ON ca.id = e.causa_id AND ca.activo = 1
       LEFT JOIN cliente c ON c.id = e.cliente
       WHERE e.id = @id`);
    return result.recordset[0] ?? null;
}

// habilita_prevision de la combinación tipo + estado actual del expediente (sección 3).
async function getHabilitacion(expediente, tx = null) {
    const r = await request(tx);
    const result = await r.input('tipo', sql.Int, expediente.tipo_expediente)
        .input('estado', sql.Int, expediente.estado_expediente).query(`
          SELECT habilita_prevision FROM tipoestadoexpediente
          WHERE tipoexpediente = @tipo AND estadoexpediente = @estado`);
    return result.recordset[0]?.habilita_prevision === true;
}

async function create(d, usuarioId, tx) {
    const r = await request(tx);
    const out = await r
      .input('expediente', sql.Int, d.expediente)
      .input('estado_prevision', sql.Int, 1)
      .input('tipo_obligacion', sql.Int, d.tipo_obligacion)
      .input('modo', sql.VarChar(20), d.modo)
      .input('obligado', sql.VarChar(20), d.obligado)
      .input('obligado_detalle', sql.VarChar(200), d.obligado_detalle ?? null)
      .input('fecha_resolucion', sql.Date, d.fecha_resolucion ?? null)
      .input('fecha_firmeza', sql.Date, d.fecha_firmeza ?? null)
      .input('fecha_estimada_pago', sql.Date, d.fecha_estimada_pago ?? null)
      .input('ejercicio', sql.Int, d.ejercicio ?? null)
      .input('monto_base', sql.Decimal(18,2), d.monto_base ?? null)
      .input('intereses_estimados', sql.Decimal(18,2), d.intereses_estimados ?? null)
      .input('tasa', sql.Int, d.tasa)
      .input('tasa_valor', sql.Decimal(9,4), d.tasa_valor ?? null)
      .input('monto_previsto', sql.Decimal(18,2), d.monto_previsto ?? null)
      .input('observaciones', sql.NVarChar(sql.MAX), d.observaciones ?? null)
      .input('usuario', sql.Int, usuarioId ?? null)
      .query(`INSERT INTO prevision (expediente, estado_prevision, tipo_obligacion, modo, obligado,
         obligado_detalle, fecha_resolucion, fecha_firmeza, fecha_estimada_pago,
         ejercicio, monto_base, intereses_estimados, tasa, tasa_valor, monto_previsto, observaciones,
         usuario_creacion, usuario_ultima_modificacion)
         OUTPUT INSERTED.id VALUES (@expediente, @estado_prevision, @tipo_obligacion, @modo, @obligado,
         @obligado_detalle, @fecha_resolucion, @fecha_firmeza, @fecha_estimada_pago,
         @ejercicio, @monto_base, @intereses_estimados, @tasa, @tasa_valor, @monto_previsto, @observaciones,
         @usuario, @usuario)`);
    return out.recordset[0].id;
}

const editables = {
    tipo_obligacion: sql.Int, modo: sql.VarChar(20), obligado: sql.VarChar(20), obligado_detalle: sql.VarChar(200),
    fecha_resolucion: sql.Date, fecha_firmeza: sql.Date,
    fecha_estimada_pago: sql.Date, ejercicio: sql.Int,
    monto_base: sql.Decimal(18,2), intereses_estimados: sql.Decimal(18,2),
    tasa: sql.Int, tasa_valor: sql.Decimal(9,4),
    monto_previsto: sql.Decimal(18,2), observaciones: sql.NVarChar(sql.MAX)
};

async function update(id, d, usuarioId, tx) {
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
    r.input('usuario', sql.Int, usuarioId ?? null);
    await r.query(`UPDATE prevision SET ${sets.join(', ')},
        usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
        WHERE id = @id`);
}

async function setEstado(id, estado, tx) {
    const r = await request(tx);
    await r.input('id', sql.Int, id).input('estado', sql.Int, estado)
        .query(`UPDATE prevision SET estado_prevision = @estado, fecha_ultima_modificacion = SYSDATETIME()
                WHERE id = @id`);
}

// "Registrar previsión": fecha en que el cliente reservó los fondos y monto previsto final.
async function registrar(id, fecha, montoPrevisto, usuarioId, tx) {
    const r = await request(tx);
    await r.input('id', sql.Int, id).input('fecha', sql.Date, fecha)
        .input('monto', sql.Decimal(18,2), montoPrevisto ?? null)
        .input('usuario', sql.Int, usuarioId ?? null)
        .query(`UPDATE prevision SET fecha_provisionado = @fecha,
                monto_previsto = COALESCE(@monto, monto_previsto),
                usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
                WHERE id = @id`);
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
         .input('tasaValor', sql.Decimal(9,4), item.tasa_valor ?? null)
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

// ---------- Prorrateo art. 730 y factura de honorarios (uno a uno) ----------

async function getProrrateo(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query('SELECT * FROM prorrateo WHERE prevision = @id');
    return out.recordset[0] ?? null;
}

async function guardarProrrateo(id, d, usuarioId, tx) {
    const r = await request(tx);
    await r.input('prevision', sql.Int, id)
     .input('aprobado', sql.Bit, d.aprobado)
     .input('verificado', sql.Bit, d.verificado)
     .input('fecha_aprobacion', sql.Date, d.fecha_aprobacion ?? null)
     .input('resolucion', sql.NVarChar(200), d.resolucion ?? null)
     .input('base_calculo', sql.Decimal(18,2), d.base_calculo ?? null)
     .input('honorarios_sujetos', sql.Decimal(18,2), d.honorarios_sujetos ?? null)
     .input('coeficiente', sql.Decimal(9,6), d.coeficiente ?? null)
     .input('monto_prorrateado', sql.Decimal(18,2), d.monto_prorrateado ?? null)
     .input('usuario', sql.Int, usuarioId ?? null)
     .query(`IF EXISTS (SELECT 1 FROM prorrateo WHERE prevision = @prevision)
        UPDATE prorrateo SET aprobado = @aprobado, verificado = @verificado,
          fecha_aprobacion = @fecha_aprobacion, resolucion = @resolucion, base_calculo = @base_calculo,
          honorarios_sujetos = @honorarios_sujetos, coeficiente = @coeficiente,
          monto_prorrateado = @monto_prorrateado,
          usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
        WHERE prevision = @prevision
      ELSE
        INSERT INTO prorrateo (prevision, aprobado, verificado, fecha_aprobacion, resolucion,
          base_calculo, honorarios_sujetos, coeficiente, monto_prorrateado,
          usuario_creacion, usuario_ultima_modificacion)
        VALUES (@prevision, @aprobado, @verificado, @fecha_aprobacion, @resolucion,
          @base_calculo, @honorarios_sujetos, @coeficiente, @monto_prorrateado, @usuario, @usuario)`);
}

async function getFactura(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query(`
       SELECT f.*, d.nombre_archivo AS documentoNombre
       FROM facturahonorarios f LEFT JOIN documento d ON d.id = f.documento
       WHERE f.prevision = @id`);
    return out.recordset[0] ?? null;
}

// Cargar o reemplazar la factura. Si no viene archivo nuevo, se conserva el anterior.
async function guardarFactura(id, d, usuarioId, tx) {
    const r = await request(tx);
    await r.input('prevision', sql.Int, id)
     .input('profesional', sql.NVarChar(200), d.profesional)
     .input('monto', sql.Decimal(18,2), d.monto)
     .input('fecha', sql.Date, d.fecha)
     .input('documento', sql.Int, d.documento ?? null)
     .input('usuario', sql.Int, usuarioId ?? null)
     .query(`IF EXISTS (SELECT 1 FROM facturahonorarios WHERE prevision = @prevision)
        UPDATE facturahonorarios SET profesional = @profesional, monto = @monto, fecha = @fecha,
          documento = COALESCE(@documento, documento),
          usuario_ultima_modificacion = @usuario, fecha_ultima_modificacion = SYSDATETIME()
        WHERE prevision = @prevision
      ELSE
        INSERT INTO facturahonorarios (prevision, profesional, monto, fecha, documento,
          usuario_creacion, usuario_ultima_modificacion)
        VALUES (@prevision, @profesional, @monto, @fecha, @documento, @usuario, @usuario)`);
}

// ---------- Historial ----------

async function getHistorial(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query(`
       SELECT h.*, ep.nombre AS estadoNombre,
              LTRIM(RTRIM(CONCAT(u.nombre, ' ', u.apellido))) AS usuarioNombre
       FROM historialprevision h
       LEFT JOIN estadoprevision ep ON ep.id = h.estado_prevision
       LEFT JOIN usuario u ON u.id = h.usuario
       WHERE h.prevision = @id ORDER BY h.fecha DESC, h.id DESC`);
    return out.recordset;
}

async function registrarHistorial(id, estado, accion, detalle, usuarioId, tx) {
    const r = await request(tx);
    await r.input('prevision', sql.Int, id)
     .input('estado', sql.Int, estado ?? null)
     .input('accion', sql.NVarChar(100), accion)
     .input('detalle', sql.NVarChar(500), detalle ? detalle.slice(0, 500) : null)
     .input('usuario', sql.Int, usuarioId ?? null)
     .query(`INSERT INTO historialprevision (prevision, estado_prevision, accion, detalle, usuario)
             VALUES (@prevision, @estado, @accion, @detalle, @usuario)`);
}

// "Documentación completa": hay una sentencia o resolución cargada en la previsión.
async function tieneSentenciaOResolucion(id, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, id).query(`
       SELECT TOP 1 1 AS hay FROM documento d JOIN tipodocumento td ON td.id = d.tipo_documento
       WHERE d.prevision = @id AND d.activo = 1 AND td.nombre IN (N'Sentencia', N'Resolución')`);
    return out.recordset.length > 0;
}

// ---------- Para otros módulos (sección 14) ----------

// Previsiones del expediente que todavía no están cerradas (bloquean finalizarlo o darlo de baja).
async function contarAbiertasPorExpediente(expedienteId, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, expedienteId).query(`
       SELECT COUNT(*) AS n FROM prevision
       WHERE expediente = @id AND activo = 1 AND estado_prevision <> 8`);
    return out.recordset[0].n;
}

async function esEstadoFinalizado(estadoExpedienteId, tx = null) {
    const r = await request(tx);
    const out = await r.input('id', sql.Int, estadoExpedienteId).query(`
       SELECT 1 AS es FROM estadoexpediente WHERE id = @id AND nombre = N'Finalizado'`);
    return out.recordset.length > 0;
}

// Baja lógica de la previsión (sección 5, DELETE /api/previsiones/:id).
async function darDeBaja(id, usuarioId, tx) {
    const r = await request(tx);
    await r.input('id', sql.Int, id).input('usuario', sql.Int, usuarioId ?? null)
        .query(`UPDATE prevision SET activo = 0, usuario_ultima_modificacion = @usuario,
                fecha_ultima_modificacion = SYSDATETIME() WHERE id = @id`);
}

// Id de un tipo de documento por nombre: los ids dependen del orden en que se cargó cada base.
async function tipoDocumentoId(nombre, tx) {
    const r = await request(tx);
    const out = await r.input('nombre', sql.NVarChar(50), nombre)
        .query('SELECT id FROM tipodocumento WHERE nombre = @nombre');
    if (!out.recordset.length) throw error(500, `Falta el tipo de documento "${nombre}"`);
    return out.recordset[0].id;
}

module.exports = { request, getAll, getById, getExpediente, getHabilitacion,
    create, update, setEstado, registrar, items, replaceItems, bloquear, tipoDocumentoId,
    getProrrateo, guardarProrrateo, getFactura, guardarFactura, getHistorial, registrarHistorial,
    tieneSentenciaOResolucion, contarAbiertasPorExpediente, esEstadoFinalizado, darDeBaja, error };
