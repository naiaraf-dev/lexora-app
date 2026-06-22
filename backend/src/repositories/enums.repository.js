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

module.exports = {
    getAll,
    create
};