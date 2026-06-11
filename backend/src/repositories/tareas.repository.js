const sql = require('mssql');
const { conectarBD } = require('../config/db');

async function obtenerTareas(filtros) {
    const pool = await conectarBD();
    const request = pool.request();

    let query = `
        SELECT
            t.id,
            t.titulo,
            t.descripcion,
            t.fecha_creacion,
            t.fecha_ultima_modificacion,
            t.fecha_vencimiento,
            t.activo,

            t.expediente,
            e.caratula AS nombre_expediente,

            t.novedad,
            n.titulo AS titulo_novedad,

            t.usuario_creacion,
            uc.nombre AS nombre_usuario_creacion,
            uc.apellido AS apellido_usuario_creacion,

            t.usuario_completado,
            ucomp.nombre AS nombre_usuario_completado,
            ucomp.apellido AS apellido_usuario_completado,

            t.prioridad,
            p.nombre AS nombre_prioridad,

            t.estado_tarea,
            et.nombre AS nombre_estado_tarea

        FROM tarea t
        INNER JOIN expediente e ON t.expediente = e.id
        LEFT JOIN novedad n ON t.novedad = n.id
        INNER JOIN usuario uc ON t.usuario_creacion = uc.id
        LEFT JOIN usuario ucomp ON t.usuario_completado = ucomp.id
        INNER JOIN prioridad p ON t.prioridad = p.id
        INNER JOIN estadotarea et ON t.estado_tarea = et.id
        WHERE 1 = 1
    `;

    if (filtros.idtarea) {
        query += ` AND t.id = @idtarea`;
        request.input('idtarea', sql.Int, filtros.idtarea);
    }

    if (filtros.titulo) {
        query += ` AND t.titulo LIKE @titulo`;
        request.input('titulo', sql.NVarChar(200), `%${filtros.titulo}%`);
    }

    if (filtros.descripcion) {
        query += ` AND t.descripcion LIKE @descripcion`;
        request.input('descripcion', sql.NVarChar(sql.MAX), `%${filtros.descripcion}%`);
    }

    if (filtros.nombreExpediente) {
        query += ` AND e.caratula LIKE @nombreExpediente`;
        request.input('nombreExpediente', sql.NVarChar(200), `%${filtros.nombreExpediente}%`);
    }

    if (filtros.expediente) {
        query += ` AND t.expediente = @expediente`;
        request.input('expediente', sql.Int, filtros.expediente);
    }

    if (filtros.novedad) {
        query += ` AND t.novedad = @novedad`;
        request.input('novedad', sql.Int, filtros.novedad);
    }

    if (filtros.prioridad) {
        query += ` AND t.prioridad = @prioridad`;
        request.input('prioridad', sql.Int, filtros.prioridad);
    }

    if (filtros.estadoTarea) {
        query += ` AND t.estado_tarea = @estadoTarea`;
        request.input('estadoTarea', sql.Int, filtros.estadoTarea);
    }

    if (filtros.usuarioCreacion) {
        query += ` AND t.usuario_creacion = @usuarioCreacion`;
        request.input('usuarioCreacion', sql.Int, filtros.usuarioCreacion);
    }

    if (filtros.usuarioCompletado) {
        query += ` AND t.usuario_completado = @usuarioCompletado`;
        request.input('usuarioCompletado', sql.Int, filtros.usuarioCompletado);
    }

    if (filtros.fechaCreacion) {
        query += ` AND CONVERT(date, t.fecha_creacion) = CONVERT(date, @fechaCreacion)`;
        request.input('fechaCreacion', sql.DateTime2, filtros.fechaCreacion);
    }

    if (filtros.fechaVencimiento) {
        query += ` AND CONVERT(date, t.fecha_vencimiento) = CONVERT(date, @fechaVencimiento)`;
        request.input('fechaVencimiento', sql.DateTime2, filtros.fechaVencimiento);
    }

    if (filtros.activo !== undefined) {
        query += ` AND t.activo = @activo`;
        request.input('activo', sql.Bit, filtros.activo);
    }

    query += ` ORDER BY t.fecha_creacion DESC`;

    const resultado = await request.query(query);
    return resultado.recordset;
}

async function obtenerTodasLasTareas() {
    return await obtenerTareas({});
}

async function obtenerTareaPorId(idTarea) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idTarea', sql.Int, idTarea)
        .query(`
            SELECT *
            FROM tarea
            WHERE id = @idTarea
        `);

    return resultado.recordset[0];
}

async function existeExpediente(idExpediente) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idExpediente', sql.Int, idExpediente)
        .query(`
            SELECT id
            FROM expediente
            WHERE id = @idExpediente
        `);

    return resultado.recordset.length > 0;
}

async function existeNovedad(idNovedad) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idNovedad', sql.Int, idNovedad)
        .query(`
            SELECT id
            FROM novedad
            WHERE id = @idNovedad
        `);

    return resultado.recordset.length > 0;
}

async function existeUsuario(idUsuario) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idUsuario', sql.Int, idUsuario)
        .query(`
            SELECT id
            FROM usuario
            WHERE id = @idUsuario
        `);

    return resultado.recordset.length > 0;
}

async function existePrioridad(idPrioridad) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idPrioridad', sql.Int, idPrioridad)
        .query(`
            SELECT id
            FROM prioridad
            WHERE id = @idPrioridad
        `);

    return resultado.recordset.length > 0;
}

async function existeEstadoTarea(idEstadoTarea) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idEstadoTarea', sql.Int, idEstadoTarea)
        .query(`
            SELECT id
            FROM estadotarea
            WHERE id = @idEstadoTarea
        `);

    return resultado.recordset.length > 0;
}

async function insertarTarea(tarea) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expediente', sql.Int, tarea.expediente)
        .input('novedad', sql.Int, tarea.novedad || null)
        .input('usuario_creacion', sql.Int, tarea.usuario_creacion)
        .input('usuario_completado', sql.Int, tarea.usuario_completado || null)
        .input('descripcion', sql.NVarChar(sql.MAX), tarea.descripcion || null)
        .input('prioridad', sql.Int, tarea.prioridad)
        .input('estado_tarea', sql.Int, tarea.estado_tarea)
        .input('fecha_vencimiento', sql.DateTime2, tarea.fecha_vencimiento || null)
        .input('titulo', sql.NVarChar(200), tarea.titulo)
        .input('activo', sql.Bit, tarea.activo)
        .query(`
            INSERT INTO tarea (
                expediente,
                novedad,
                usuario_creacion,
                usuario_completado,
                descripcion,
                prioridad,
                estado_tarea,
                fecha_vencimiento,
                titulo,
                activo
            )
            OUTPUT INSERTED.*
            VALUES (
                @expediente,
                @novedad,
                @usuario_creacion,
                @usuario_completado,
                @descripcion,
                @prioridad,
                @estado_tarea,
                @fecha_vencimiento,
                @titulo,
                @activo
            )
        `);

    return resultado.recordset[0];
}

async function modificarTarea(idTarea, tarea) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idTarea', sql.Int, idTarea)
        .input('expediente', sql.Int, tarea.expediente)
        .input('novedad', sql.Int, tarea.novedad || null)
        .input('usuario_completado', sql.Int, tarea.usuario_completado || null)
        .input('descripcion', sql.NVarChar(sql.MAX), tarea.descripcion || null)
        .input('prioridad', sql.Int, tarea.prioridad)
        .input('estado_tarea', sql.Int, tarea.estado_tarea)
        .input('fecha_vencimiento', sql.DateTime2, tarea.fecha_vencimiento || null)
        .input('titulo', sql.NVarChar(200), tarea.titulo)
        .input('activo', sql.Bit, tarea.activo)
        .query(`
            UPDATE tarea
            SET
                expediente = @expediente,
                novedad = @novedad,
                usuario_completado = @usuario_completado,
                descripcion = @descripcion,
                prioridad = @prioridad,
                estado_tarea = @estado_tarea,
                fecha_vencimiento = @fecha_vencimiento,
                titulo = @titulo,
                activo = @activo,
                fecha_ultima_modificacion = SYSDATETIME()
            OUTPUT INSERTED.*
            WHERE id = @idTarea
        `);

    return resultado.recordset[0];
}

async function eliminarTareaPorId(idTarea) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idTarea', sql.Int, idTarea)
        .query(`
            DELETE FROM tarea
            OUTPUT DELETED.*
            WHERE id = @idTarea
        `);

    return resultado.recordset[0];
}

module.exports = {
    obtenerTareas,
    obtenerTodasLasTareas,
    obtenerTareaPorId,
    existeExpediente,
    existeNovedad,
    existeUsuario,
    existePrioridad,
    existeEstadoTarea,
    insertarTarea,
    modificarTarea,
    eliminarTareaPorId
};