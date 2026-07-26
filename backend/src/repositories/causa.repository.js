const { sql, conectarBD } = require('../config/db');

// trae todas las causas activas con sus expedientes
async function getAll({ area, numero } = {}) {
    const pool = await conectarBD();
    const req = pool.request();

    let where = 'WHERE c.activo = 1';

    if (area) {
        req.input('area', sql.NVarChar, area);
        where += ' AND c.area = @area';
    }
    if (numero) {
        req.input('numero', sql.NVarChar, `%${numero}%`);
        where += ' AND c.numero_causa LIKE @numero';
    }

    const resultado = await req.query(`
        SELECT
            c.id,
            c.numero_causa,
            c.area,
            c.activo,
            c.fecha_creacion,
            c.fecha_ultima_modificacion,
            c.expediente_principal_id,
            e.id                            AS expedienteId,
            e.caratula,
            e.area                          AS expedienteArea,
            e.activo                        AS expedienteActivo,
            e.fecha_inicio,
            e.fecha_creacion                AS expedienteFechaCreacion,
            e.fecha_ultima_modificacion     AS expedienteUltimaActualizacion,
            te.id                           AS tipoId,
            te.nombre                       AS tipoNombre,
            ee.id                           AS estadoId,
            ee.nombre                       AS estadoNombre,
            cl.id                           AS clienteId,
            cl.nombre + ' ' + cl.apellido   AS clienteNombre,
            up.id                           AS usuarioPrincipalId,
            up.nombre + ' ' + up.apellido   AS usuarioPrincipalNombre
        FROM causa c
        LEFT JOIN expediente e  ON e.causa_id = c.id AND e.activo = 1
        LEFT JOIN tipoexpediente   te ON te.id = e.tipo_expediente
        LEFT JOIN estadoexpediente ee ON ee.id = e.estado_expediente
        LEFT JOIN cliente          cl ON cl.id = e.cliente
        LEFT JOIN usuario          up ON up.id = e.usuario_principal
        ${where}
        ORDER BY c.fecha_ultima_modificacion DESC, e.id ASC
    `);

    return resultado.recordset;
}

// trae una causa por id con todos sus expedientes
async function getById(id) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT
                c.id,
                c.numero_causa,
                c.area,
                c.activo,
                c.fecha_creacion,
                c.fecha_ultima_modificacion,
                c.expediente_principal_id,
                e.id                            AS expedienteId,
                e.caratula,
                e.activo                        AS expedienteActivo,
                e.fecha_inicio,
                e.fecha_creacion                AS expedienteFechaCreacion,
                e.fecha_ultima_modificacion     AS expedienteUltimaActualizacion,
                te.id                           AS tipoId,
                te.nombre                       AS tipoNombre,
                ee.id                           AS estadoId,
                ee.nombre                       AS estadoNombre,
                cl.id                           AS clienteId,
                cl.nombre + ' ' + cl.apellido   AS clienteNombre,
                up.id                           AS usuarioPrincipalId,
                up.nombre + ' ' + up.apellido   AS usuarioPrincipalNombre
            FROM causa c
            LEFT JOIN expediente e  ON e.causa_id = c.id AND e.activo = 1
            LEFT JOIN tipoexpediente   te ON te.id = e.tipo_expediente
            LEFT JOIN estadoexpediente ee ON ee.id = e.estado_expediente
            LEFT JOIN cliente          cl ON cl.id = e.cliente
            LEFT JOIN usuario          up ON up.id = e.usuario_principal
            WHERE c.id = @id AND c.activo = 1
            ORDER BY e.id ASC
        `);

    return resultado.recordset;
}

// busca una causa por numero_causa y area
async function getByCausaNumero(numero_causa, area) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('numero_causa', sql.NVarChar, numero_causa)
        .input('area', sql.NVarChar, area)
        .query(`
            SELECT TOP 1 * FROM causa
            WHERE numero_causa = @numero_causa
            AND area = @area
            AND activo = 1
        `);

    return resultado.recordset[0] ?? null;
}

// crea una causa nueva
async function crear({ numero_causa, area, expediente_principal_id = null }) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('numero_causa', sql.NVarChar(200), numero_causa)
        .input('area', sql.NVarChar(100), area)
        .input('expediente_principal_id', sql.Int, expediente_principal_id)
        .query(`
            INSERT INTO causa (numero_causa, area, expediente_principal_id, fecha_creacion, fecha_ultima_modificacion, activo)
            OUTPUT INSERTED.id
            VALUES (@numero_causa, @area, @expediente_principal_id, GETDATE(), GETDATE(), 1)
        `);

    return resultado.recordset[0].id;
}

// actualiza el expediente principal de una causa
async function actualizarExpedientePrincipal(id, expediente_principal_id) {
    const pool = await conectarBD();

    await pool.request()
        .input('id', sql.Int, id)
        .input('expediente_principal_id', sql.Int, expediente_principal_id)
        .query(`
            UPDATE causa
            SET expediente_principal_id = @expediente_principal_id,
                fecha_ultima_modificacion = GETDATE()
            WHERE id = @id
        `);
}

// baja logica de la causa
async function eliminar(id) {
    const pool = await conectarBD();

    await pool.request()
        .input('id', sql.Int, id)
        .query(`
            UPDATE causa
            SET activo = 0, fecha_ultima_modificacion = GETDATE()
            WHERE id = @id
        `);
}

module.exports = { getAll, getById, getByCausaNumero, crear, actualizarExpedientePrincipal, eliminar };