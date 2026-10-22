const { sql, conectarBD } = require('../config/db');

// acceso a documento_resumen, que guarda el resumen de cada documento
// y funciona como cola de trabajo del proceso en segundo plano (HU42)

// encola un documento para resumir; si ya tenia resumen (archivo reemplazado) lo limpia y lo vuelve a encolar
async function marcarPendiente(documentoId) {
    const pool = await conectarBD();

    await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .query(`
            MERGE dbo.documento_resumen AS r
            USING (SELECT @documentoId AS documento_id) AS s
                ON r.documento_id = s.documento_id
            WHEN MATCHED THEN UPDATE SET
                estado = 'pendiente',
                intentos = 0,
                ultimo_error = NULL,
                fecha_proceso = NULL,
                tipo_detectado = NULL,
                resumen = NULL,
                palabras_clave = NULL,
                datos_json = NULL,
                modelo = NULL
            WHEN NOT MATCHED THEN
                INSERT (documento_id) VALUES (s.documento_id);
        `);
}

// toma un lote de pendientes (y errores con intentos disponibles) y los marca como 'procesando'.
// UPDLOCK + READPAST: si dos procesos corren a la vez, no toman el mismo documento
async function tomarLote(lote, maxIntentos) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('lote', sql.Int, lote)
        .input('maxIntentos', sql.Int, maxIntentos)
        .query(`
            UPDATE TOP (@lote) r
            SET estado = 'procesando',
                fecha_proceso = SYSDATETIME()
            OUTPUT INSERTED.documento_id AS documentoId
            FROM dbo.documento_resumen AS r WITH (UPDLOCK, READPAST, ROWLOCK)
            WHERE r.estado = 'pendiente'
               OR (r.estado = 'error' AND r.intentos < @maxIntentos);
        `);

    return resultado.recordset.map((fila) => fila.documentoId);
}

// devuelve a 'pendiente' los que quedaron trabados en 'procesando' (por ejemplo, si se reinicio el servidor)
async function liberarTrabados(minutos) {
    const pool = await conectarBD();

    await pool.request()
        .input('minutos', sql.Int, minutos)
        .query(`
            UPDATE dbo.documento_resumen
            SET estado = 'pendiente'
            WHERE estado = 'procesando'
              AND fecha_proceso < DATEADD(minute, -@minutos, SYSDATETIME());
        `);
}

// devuelve un documento a 'pendiente' sin contar el intento (por ejemplo, si el proveedor de IA no responde)
async function devolverAPendiente(documentoId) {
    const pool = await conectarBD();

    await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .query(`UPDATE dbo.documento_resumen SET estado = 'pendiente' WHERE documento_id = @documentoId;`);
}

async function obtenerDocumento(documentoId) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .query(`
            SELECT id, nombre_archivo AS nombreArchivo, storage_key AS storageKey, activo
            FROM dbo.documento
            WHERE id = @documentoId;
        `);

    return resultado.recordset[0] ?? null;
}

async function guardarResumen(documentoId, { tipoDetectado, resumen, palabrasClave, datosJson, modelo }) {
    const pool = await conectarBD();

    await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .input('tipoDetectado', sql.NVarChar(100), tipoDetectado || null)
        .input('resumen', sql.NVarChar(2000), resumen)
        .input('palabrasClave', sql.NVarChar(1000), palabrasClave || null)
        .input('datosJson', sql.NVarChar(sql.MAX), datosJson)
        .input('modelo', sql.VarChar(100), modelo)
        .query(`
            UPDATE dbo.documento_resumen
            SET estado = 'procesado',
                tipo_detectado = @tipoDetectado,
                resumen = @resumen,
                palabras_clave = @palabrasClave,
                datos_json = @datosJson,
                modelo = @modelo,
                ultimo_error = NULL
            WHERE documento_id = @documentoId;
        `);
}

// suma un intento; despues de RESUMEN_IA_MAX_INTENTOS el documento queda en 'error' y no se reintenta
async function registrarError(documentoId, mensaje) {
    const pool = await conectarBD();

    await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .input('mensaje', sql.NVarChar(500), String(mensaje).slice(0, 500))
        .query(`
            UPDATE dbo.documento_resumen
            SET estado = 'error',
                intentos = intentos + 1,
                ultimo_error = @mensaje
            WHERE documento_id = @documentoId;
        `);
}

// documentos que no se pueden resumir (tipo de archivo no soportado, sin archivo, sin texto)
async function marcarOmitido(documentoId, motivo) {
    const pool = await conectarBD();

    await pool.request()
        .input('documentoId', sql.Int, documentoId)
        .input('motivo', sql.NVarChar(500), String(motivo).slice(0, 500))
        .query(`
            UPDATE dbo.documento_resumen
            SET estado = 'omitido',
                ultimo_error = @motivo
            WHERE documento_id = @documentoId;
        `);
}

// ── backfill de documentos cargados antes de la HU42 (HU43) ──────────────────

// documentos activos con archivo real en Cloudinary y sin fila en documento_resumen.
// los creados sin archivo (storage_key simulado 'documentos/...') no se pueden descargar y se excluyen
const CONDICION_SIN_RESUMEN = `
    d.activo = 1
    AND d.storage_key LIKE 'lexora/documentos/%'
    AND NOT EXISTS (SELECT 1 FROM dbo.documento_resumen r WHERE r.documento_id = d.id)
`;

// lista los documentos que el backfill encolaria (para la estimacion)
async function listarSinResumen(limite) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('limite', sql.Int, limite)
        .query(`
            SELECT TOP (@limite) d.id, d.nombre_archivo AS nombreArchivo
            FROM dbo.documento d
            WHERE ${CONDICION_SIN_RESUMEN}
            ORDER BY d.id;
        `);

    return resultado.recordset;
}

// encola de una vez los documentos sin resumen; devuelve cuantos encolo
async function encolarSinResumen(limite) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('limite', sql.Int, limite)
        .query(`
            INSERT INTO dbo.documento_resumen (documento_id)
            SELECT TOP (@limite) d.id
            FROM dbo.documento d
            WHERE ${CONDICION_SIN_RESUMEN}
            ORDER BY d.id;
        `);

    return resultado.rowsAffected[0];
}

// los documentos que agotaron sus intentos vuelven a la cola con los intentos en cero
async function reiniciarErrores() {
    const pool = await conectarBD();

    const resultado = await pool.request().query(`
        UPDATE dbo.documento_resumen
        SET estado = 'pendiente', intentos = 0
        WHERE estado = 'error';
    `);

    return resultado.rowsAffected[0];
}

// cantidad de documentos por estado, para el reporte final
async function contarPorEstado() {
    const pool = await conectarBD();

    const resultado = await pool.request().query(`
        SELECT estado, COUNT(*) AS cantidad FROM dbo.documento_resumen GROUP BY estado;
    `);

    return Object.fromEntries(resultado.recordset.map((fila) => [fila.estado, fila.cantidad]));
}

// documentos con error, con el motivo, para el reporte final
async function listarErrores(limite = 50) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('limite', sql.Int, limite)
        .query(`
            SELECT TOP (@limite) r.documento_id AS documentoId, d.nombre_archivo AS nombreArchivo,
                   r.intentos, r.ultimo_error AS ultimoError
            FROM dbo.documento_resumen r
            JOIN dbo.documento d ON d.id = r.documento_id
            WHERE r.estado = 'error'
            ORDER BY r.documento_id;
        `);

    return resultado.recordset;
}

module.exports = {
    listarSinResumen,
    encolarSinResumen,
    reiniciarErrores,
    contarPorEstado,
    listarErrores,
    marcarPendiente,
    tomarLote,
    liberarTrabados,
    devolverAPendiente,
    obtenerDocumento,
    guardarResumen,
    registrarError,
    marcarOmitido,
};
