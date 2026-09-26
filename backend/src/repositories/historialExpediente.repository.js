const { sql, conectarBD } = require('../config/db');

// permite trabajar con pool normal o con una transaccion existente
async function crearRequest(transaction = null) {
    if (transaction) {
        return new sql.Request(transaction);
    }

    const pool = await conectarBD();
    return pool.request();
}

// registra un cambio de estado
async function registrarCambio(
    expedienteId,
    estadoExpedienteId,
    transaction = null
) {
    const request = await crearRequest(transaction);

    const resultado = await request
        .input('expedienteId', sql.Int, expedienteId)
        .input('estadoExpedienteId', sql.Int, estadoExpedienteId)
        .query(`
            INSERT INTO historialexpediente (
                expediente,
                estado_expediente,
                fecha_cambio_estado
            )
            OUTPUT INSERTED.*
            VALUES (
                @expedienteId,
                @estadoExpedienteId,
                SYSDATETIME()
            )
        `);

    return resultado.recordset[0];
}

// opcional: sirve después para mostrar el historial del expediente
async function obtenerPorExpediente(expedienteId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT
                h.id,
                h.expediente,
                h.estado_expediente AS estadoId,
                ee.nombre AS estadoNombre,
                h.fecha_cambio_estado
            FROM historialexpediente h
            INNER JOIN estadoexpediente ee
                ON ee.id = h.estado_expediente
            WHERE h.expediente = @expedienteId
            ORDER BY h.fecha_cambio_estado ASC, h.id ASC
        `);

    return resultado.recordset;
}

module.exports = {
    registrarCambio,
    obtenerPorExpediente
};