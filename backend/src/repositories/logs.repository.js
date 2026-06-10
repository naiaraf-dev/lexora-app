const { sql, conectarBD } = require('../config/db');

async function getAll({ fechaDesde, fechaHasta, usuario, modulo, accion, resultado, pagina = 1, pageSize = 10 }) {
    const pool = await conectarBD();
    const req = pool.request();

    let where = 'WHERE 1=1';

    if (fechaDesde) {
        req.input('fechaDesde', sql.DateTime2, fechaDesde);
        where += ' AND ls.fecha_hora >= @fechaDesde';
    }
    if (fechaHasta) {
        req.input('fechaHasta', sql.DateTime2, fechaHasta + 'T23:59:59');
        where += ' AND ls.fecha_hora <= @fechaHasta';
    }
    if (usuario) {
        req.input('usuario', sql.Int, Number(usuario));
        where += ' AND ls.usuario = @usuario';
    }
    if (modulo) {
        req.input('modulo', sql.NVarChar, modulo);
        where += ' AND ls.modulo = @modulo';
    }
    if (accion) {
        req.input('accion', sql.NVarChar, accion);
        where += ' AND ls.accion = @accion';
    }
    if (resultado) {
        req.input('resultado', sql.NVarChar, resultado);
        where += ' AND ls.resultado = @resultado';
    }

    const offset = (pagina - 1) * pageSize;
    req.input('offset', sql.Int, offset);
    req.input('pageSize', sql.Int, pageSize);

    const res = await req.query(`
        SELECT
            ls.id,
            ls.fecha_hora,
            ls.accion,
            ls.modulo,
            ls.descripcion,
            ls.resultado,
            ls.ip,
            u.id AS usuarioId,
            u.nombre + ' ' + u.apellido AS usuarioNombre,
            COUNT(*) OVER() AS totalRegistros
        FROM log_seguridad ls
        LEFT JOIN usuario u ON u.id = ls.usuario
        ${where}
        ORDER BY ls.fecha_hora DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return res.recordset;
}

async function getById(id) {
    const pool = await conectarBD();
    const res = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            SELECT
                ls.id,
                ls.fecha_hora,
                ls.accion,
                ls.modulo,
                ls.descripcion,
                ls.resultado,
                ls.ip,
                u.id AS usuarioId,
                u.nombre + ' ' + u.apellido AS usuarioNombre
            FROM log_seguridad ls
            LEFT JOIN usuario u ON u.id = ls.usuario
            WHERE ls.id = @id
        `);
    return res.recordset[0] ?? null;
}

async function getStats({ fechaDesde, fechaHasta }) {
    const pool = await conectarBD();
    const req = pool.request();

    let where = 'WHERE 1=1';
    if (fechaDesde) {
        req.input('fechaDesde', sql.DateTime2, fechaDesde);
        where += ' AND fecha_hora >= @fechaDesde';
    }
    if (fechaHasta) {
        req.input('fechaHasta', sql.DateTime2, fechaHasta + 'T23:59:59');
        where += ' AND fecha_hora <= @fechaHasta';
    }

    const res = await req.query(`
        SELECT
            COUNT(*)                                           AS totalEventos,
            ISNULL(SUM(CASE WHEN resultado = 'OK' THEN 1 ELSE 0 END), 0) AS exitosos,
            ISNULL(SUM(CASE WHEN resultado = 'Error' THEN 1 ELSE 0 END), 0) AS errores,
            COUNT(DISTINCT usuario)                            AS usuariosActivos
        FROM log_seguridad
        ${where}
    `);
    return res.recordset[0];
}

async function getUsuarios() {
    const pool = await conectarBD();
    const res = await pool.request().query(`
        SELECT DISTINCT u.id, u.nombre + ' ' + u.apellido AS nombre
        FROM log_seguridad ls
        JOIN usuario u ON u.id = ls.usuario
        ORDER BY nombre
    `);
    return res.recordset;
}

async function crear({ usuario, accion, modulo, descripcion, resultado, ip }) {
    const pool = await conectarBD();
    await pool.request()
        .input('usuario', sql.Int, usuario)
        .input('accion', sql.NVarChar(50), accion)
        .input('modulo', sql.NVarChar(50), modulo)
        .input('descripcion', sql.NVarChar(sql.MAX), descripcion ?? null)
        .input('resultado', sql.NVarChar(20), resultado ?? 'OK')
        .input('ip', sql.NVarChar(45), ip ?? null)
        .query(`
            INSERT INTO log_seguridad (usuario, accion, modulo, descripcion, resultado, ip)
            VALUES (@usuario, @accion, @modulo, @descripcion, @resultado, @ip)
        `);
}

module.exports = { getAll, getById, getStats, getUsuarios, crear };
