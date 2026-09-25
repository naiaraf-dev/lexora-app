const { sql, conectarBD } = require('../config/db');

const tablasPermitidas = {
    tipocliente: 'tipocliente',
    rolcliente: 'rolcliente',
    rolusuario: 'rolusuario',
    tipoexpediente: 'tipoexpediente',
    tipodocumento: 'tipodocumento',
    tiponovedad: 'tiponovedad',
    estadotarea: 'estadotarea',
    estadoexpediente: 'estadoexpediente',
    prioridad: 'prioridad'
};

function obtenerTabla(nombreEnum) {
    const tabla = tablasPermitidas[nombreEnum];

    if (!tabla) {
        throw new Error('Enum no permitido');
    }

    return tabla;
}

async function getAll(nombreEnum) {
    const tabla = obtenerTabla(nombreEnum);
    const pool = await conectarBD();

    const resultado = await pool.request().query(`
        SELECT id, nombre
        FROM ${tabla}
        ORDER BY nombre
    `);

    return resultado.recordset;
}

async function create(nombreEnum, nombre) {
    const tabla = obtenerTabla(nombreEnum);
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('nombre', sql.NVarChar(50), nombre.trim())
        .query(`
            INSERT INTO ${tabla} (nombre)
            OUTPUT INSERTED.id, INSERTED.nombre
            VALUES (@nombre)
        `);

    return resultado.recordset[0];
}

async function getEstadosPorTipoExpediente(tipoExpedienteId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .query(`
            SELECT
                ee.id AS estadoId,
                ee.nombre AS estadoNombre,
                tet.orden
            FROM tipoestadoexpediente tet
            INNER JOIN estadoexpediente ee
                ON ee.id = tet.estadoexpediente
            WHERE tet.tipoexpediente = @tipoExpedienteId
            ORDER BY tet.orden
        `);

    return resultado.recordset;
}

async function getTransicionesPorTipo(tipoExpedienteId) {
    const pool = await conectarBD();
    const resultado = await pool.request()
        .input('tipoExpedienteId', sql.Int, tipoExpedienteId)
        .query(`
        SELECT
            t.estado_origen   AS estadoOrigenId,
            eo.nombre         AS estadoOrigenNombre,
            t.estado_destino  AS estadoDestinoId,
            ed.nombre         AS estadoDestinoNombre
        FROM transicion_estado t
        INNER JOIN estadoexpediente eo ON eo.id = t.estado_origen
        INNER JOIN estadoexpediente ed ON ed.id = t.estado_destino
        WHERE t.tipo_expediente = @tipoExpedienteId
        ORDER BY t.estado_origen, t.estado_destino
        `);
    return resultado.recordset;
}

module.exports = {
    getAll,
    create,
    getEstadosPorTipoExpediente,
    getTransicionesPorTipo
};