const { sql, conectarBD } = require('../config/db');

// regla de acceso de Litis: cada usuario ve solo los expedientes en los que es abogado
// responsable o secundario, y lo que cuelga de ellos (documentos, tareas, novedades y sus clientes).
// es la unica definicion de la regla: la usan las busquedas, el modo expediente y los enlaces de descarga.
function condicionAcceso(alias, parametro) {
    return `(${alias}.usuario_principal = ${parametro} OR ${alias}.usuario_secundario = ${parametro})`;
}

// true si el expediente existe, esta activo y es del usuario
async function puedeVerExpediente(usuarioId, expedienteId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .input('expedienteId', sql.Int, expedienteId)
        .query(`
            SELECT 1 AS permitido
            FROM expediente e
            WHERE e.id = @expedienteId AND e.activo = 1 AND ${condicionAcceso('e', '@usuarioId')}
        `);

    return resultado.recordset.length > 0;
}

module.exports = { condicionAcceso, puedeVerExpediente };
