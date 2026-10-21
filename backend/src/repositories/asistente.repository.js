const { sql, conectarBD } = require('../config/db');

// documento con lo necesario para que Litis lo lea bajo demanda (HU45),
// incluido el estado de su resumen: 'omitido' marca "no procesar con IA"
async function obtenerDocumentoParaLectura(idDocumento) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('id', sql.Int, idDocumento)
        .query(`
            SELECT
                d.id,
                d.nombre_archivo AS nombreArchivo,
                d.storage_key AS storageKey,
                d.activo,
                d.expediente AS expedienteId,
                td.nombre AS tipoDocumento,
                r.estado AS estadoResumen
            FROM documento d
            LEFT JOIN tipodocumento td ON td.id = d.tipo_documento
            LEFT JOIN documento_resumen r ON r.documento_id = d.id
            WHERE d.id = @id
        `);

    return resultado.recordset[0] ?? null;
}

module.exports = { obtenerDocumentoParaLectura };
