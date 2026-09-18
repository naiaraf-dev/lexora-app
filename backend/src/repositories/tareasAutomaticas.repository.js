const { sql, conectarBD } = require('../config/db');

// permite usar el pool normal o una transaccion existente
async function crearRequest(transaction = null) {
    if (transaction) {
        return new sql.Request(transaction);
    }

    const pool = await conectarBD();
    return pool.request();
}

// trae las plantillas correspondientes a un tipo + estado
async function obtenerPorTipoYEstado(
    tipoExpedienteId,
    estadoExpedienteId,
    transaction = null
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .input('estadoExpedienteId', sql.Int, estadoExpedienteId)
        .query(`
            SELECT
                ta.id,
                ta.tipo_expediente,
                ta.estado_expediente,
                ta.orden,
                ta.titulo
            FROM tareaautomatica ta
            WHERE ta.tipo_expediente = @tipoExpedienteId
              AND ta.estado_expediente = @estadoExpedienteId
            ORDER BY ta.orden
        `);

    return resultado.recordset;
}

// busca el primer estado configurado para el tipo de expediente
async function obtenerPrimerEstado(tipoExpedienteId, transaction = null) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .query(`
            SELECT TOP 1
                tee.estadoexpediente AS estadoId,
                ee.nombre AS estadoNombre,
                tee.orden
            FROM tipoestadoexpediente tee
            INNER JOIN estadoexpediente ee
                ON ee.id = tee.estadoexpediente
            WHERE tee.tipoexpediente = @tipoExpedienteId
            ORDER BY tee.orden
        `);

    return resultado.recordset[0] ?? null;
}

// valida que el estado sea valido para ese tipo de expediente
async function estadoPermitido(
    tipoExpedienteId,
    estadoExpedienteId,
    transaction = null
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .input('estadoExpedienteId', sql.Int, estadoExpedienteId)
        .query(`
            SELECT TOP 1 1 AS existe
            FROM tipoestadoexpediente
            WHERE tipoexpediente = @tipoExpedienteId
              AND estadoexpediente = @estadoExpedienteId
        `);

    return resultado.recordset.length > 0;
}

// valida usuario
async function existeUsuario(usuarioId, transaction = null) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('usuarioId', sql.Int, usuarioId)
        .query(`
            SELECT id
            FROM usuario
            WHERE id = @usuarioId
        `);

    return resultado.recordset.length > 0;
}

// valida prioridad
async function existePrioridad(prioridadId, transaction = null) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('prioridadId', sql.Int, prioridadId)
        .query(`
            SELECT id
            FROM prioridad
            WHERE id = @prioridadId
        `);

    return resultado.recordset.length > 0;
}

// genera todas las tareas reales a partir de las plantillas
async function generarTareas(
    {
        expedienteId,
        tipoExpedienteId,
        estadoExpedienteId,
        usuarioCreacionId,
        prioridadId
    },
    transaction
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('expedienteId', sql.Int, expedienteId)
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .input('estadoExpedienteId', sql.Int, estadoExpedienteId)
        .input('usuarioCreacionId', sql.Int, usuarioCreacionId)
        .input('prioridadId', sql.Int, prioridadId)
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
                hora,
                automatica
            )
            OUTPUT
                INSERTED.id,
                INSERTED.expediente,
                INSERTED.titulo,
                INSERTED.usuario_creacion,
                INSERTED.prioridad,
                INSERTED.estado_tarea,
                INSERTED.automatica
            SELECT
                @expedienteId,
                NULL,
                @usuarioCreacionId,
                NULL,
                NULL,
                @prioridadId,
                1,
                NULL,
                ta.titulo,
                NULL,
                1
            FROM tareaautomatica ta
            WHERE ta.tipo_expediente = @tipoExpedienteId
              AND ta.estado_expediente = @estadoExpedienteId
        `);

    return resultado.recordset;
}

// trae las tareas automaticas que siguen en estado Pendiente
// para un expediente
async function obtenerPendientesPorExpediente(
    expedienteId,
    transaction = null
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT
                t.id,
                t.titulo,
                t.descripcion,
                t.fecha_creacion,
                t.fecha_ultima_modificacion,
                t.fecha_vencimiento,
                t.hora,

                t.expediente,

                t.usuario_creacion,
                uc.nombre AS nombre_usuario_creacion,
                uc.apellido AS apellido_usuario_creacion,

                t.prioridad,
                p.nombre AS nombre_prioridad,

                t.estado_tarea,
                et.nombre AS nombre_estado_tarea,

                t.automatica

            FROM tarea t

            LEFT JOIN usuario uc
                ON uc.id = t.usuario_creacion

            LEFT JOIN prioridad p
                ON p.id = t.prioridad

            LEFT JOIN estadotarea et
                ON et.id = t.estado_tarea

            WHERE t.expediente = @expedienteId
              AND t.automatica = 1
              AND t.estado_tarea = 1

            ORDER BY t.fecha_creacion ASC, t.id ASC
        `);

    return resultado.recordset;
}

// cuenta tareas automaticas que todavia NO estan cumplidas.
// tanto Pendiente (1) como Vencido (3) bloquean el cambio de estado.
async function contarNoCumplidasPorExpediente(
    expedienteId,
    transaction = null
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT COUNT(*) AS cantidad
            FROM tarea
            WHERE expediente = @expedienteId
              AND automatica = 1
              AND estado_tarea <> 2
        `);

    return Number(resultado.recordset[0]?.cantidad ?? 0);
}

module.exports = {
    obtenerPorTipoYEstado,
    obtenerPrimerEstado,
    estadoPermitido,
    existeUsuario,
    existePrioridad,
    generarTareas,
    obtenerPendientesPorExpediente,
    contarNoCumplidasPorExpediente
};