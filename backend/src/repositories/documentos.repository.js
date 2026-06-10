const sql = require('mssql');
const { conectarBD } = require('../config/db');

async function obtenerDocumentos(filtros) {
    const pool = await conectarBD();

    const request = pool.request();

    let query = `
        SELECT 
            d.id,
            d.nombre_archivo,
            d.descripcion,
            d.fecha_creacion,
            d.fecha_documento,
            d.fecha_ultima_modificacion,
            d.storage_key,
            d.activo,

            d.expediente,
            e.caratula AS nombre_expediente,

            d.novedad,
            n.descripcion AS descripcion_novedad,

            d.usuario_creacion,
            u.nombre AS nombre_usuario_creacion,
            u.apellido AS apellido_usuario_creacion,

            d.tipo_documento,
            td.nombre AS nombre_tipo_documento

        FROM documento d
        INNER JOIN expediente e ON d.expediente = e.id
        LEFT JOIN novedad n ON d.novedad = n.id
        INNER JOIN usuario u ON d.usuario_creacion = u.id
        INNER JOIN tipodocumento td ON d.tipo_documento = td.id
        WHERE 1 = 1
    `;

    if (filtros.iddocumento) {
        query += ` AND d.id = @iddocumento`;
        request.input('iddocumento', sql.Int, filtros.iddocumento);
    }

    if (filtros.nombreExpediente) {
        query += ` AND e.caratula LIKE @nombreExpediente`;
        request.input('nombreExpediente', sql.NVarChar(200), `%${filtros.nombreExpediente}%`);
    }

    if (filtros.tipoDocumento) {
        query += ` AND td.nombre LIKE @tipoDocumento`;
        request.input('tipoDocumento', sql.NVarChar(100), `%${filtros.tipoDocumento}%`);
    }

    if (filtros.fechaCreacion) {
        query += ` AND CONVERT(date, d.fecha_creacion) = CONVERT(date, @fechaCreacion)`;
        request.input('fechaCreacion', sql.DateTime2, filtros.fechaCreacion);
    }

    if (filtros.nombreDocumento) {
        query += ` AND d.nombre_archivo LIKE @nombreDocumento`;
        request.input('nombreDocumento', sql.NVarChar(200), `%${filtros.nombreDocumento}%`);
    }

    if (filtros.fechaUltimaModificacion) {
        query += ` AND CONVERT(date, d.fecha_ultima_modificacion) = CONVERT(date, @fechaUltimaModificacion)`;
        request.input('fechaUltimaModificacion', sql.DateTime2, filtros.fechaUltimaModificacion);
    }

    if (filtros.activo !== undefined) {
        query += ` AND d.activo = @activo`;
        request.input('activo', sql.Bit, filtros.activo);
    }

    query += ` ORDER BY d.fecha_creacion DESC`;

    const resultado = await request.query(query);
    return resultado.recordset;
}

async function obtenerTodosLosDocumentos() {
    const pool = await conectarBD();

    const resultado = await pool.request().query(`
        SELECT 
            d.id,
            d.nombre_archivo,
            d.descripcion,
            d.fecha_creacion,
            d.fecha_documento,
            d.fecha_ultima_modificacion,
            d.storage_key,
            d.activo,

            d.expediente,
            e.caratula AS nombre_expediente,

            d.novedad,
            n.descripcion AS descripcion_novedad,

            d.usuario_creacion,
            u.nombre AS nombre_usuario_creacion,
            u.apellido AS apellido_usuario_creacion,

            d.tipo_documento,
            td.nombre AS nombre_tipo_documento

        FROM documento d
        INNER JOIN expediente e ON d.expediente = e.id
        LEFT JOIN novedad n ON d.novedad = n.id
        INNER JOIN usuario u ON d.usuario_creacion = u.id
        INNER JOIN tipodocumento td ON d.tipo_documento = td.id
        ORDER BY d.fecha_creacion DESC
    `);

    return resultado.recordset;
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

async function existeTipoDocumento(idTipoDocumento) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idTipoDocumento', sql.Int, idTipoDocumento)
        .query(`
            SELECT id 
            FROM tipodocumento 
            WHERE id = @idTipoDocumento
        `);

    return resultado.recordset.length > 0;
}

async function insertarDocumento(documento) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('nombre_archivo', sql.NVarChar(200), documento.nombre_archivo)
        .input('descripcion', sql.NVarChar(sql.MAX), documento.descripcion || null)
        .input('fecha_documento', sql.DateTime2, documento.fecha_documento || null)
        .input('storage_key', sql.NVarChar(sql.MAX), documento.storage_key)
        .input('activo', sql.Bit, documento.activo)
        .input('expediente', sql.Int, documento.expediente)
        .input('novedad', sql.Int, documento.novedad || null)
        .input('usuario_creacion', sql.Int, documento.usuario_creacion)
        .input('tipo_documento', sql.Int, documento.tipo_documento)
        .query(`
            INSERT INTO documento (
                nombre_archivo,
                descripcion,
                fecha_documento,
                storage_key,
                activo,
                expediente,
                novedad,
                usuario_creacion,
                tipo_documento
            )
            OUTPUT INSERTED.*
            VALUES (
                @nombre_archivo,
                @descripcion,
                @fecha_documento,
                @storage_key,
                @activo,
                @expediente,
                @novedad,
                @usuario_creacion,
                @tipo_documento
            )
        `);

    return resultado.recordset[0];
}

async function obtenerDocumentoPorId(idDocumento) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idDocumento', sql.Int, idDocumento)
        .query(`
            SELECT 
                id,
                nombre_archivo,
                descripcion,
                fecha_creacion,
                fecha_documento,
                fecha_ultima_modificacion,
                storage_key,
                activo,
                expediente,
                novedad,
                usuario_creacion,
                tipo_documento
            FROM documento
            WHERE id = @idDocumento
        `);

    return resultado.recordset[0];
}

async function eliminarDocumentoPorId(idDocumento) {
    const pool = await conectarBD();

    const resultado = await pool.request()
        .input('idDocumento', sql.Int, idDocumento)
        .query(`
            DELETE FROM documento
            OUTPUT DELETED.*
            WHERE id = @idDocumento
        `);

    return resultado.recordset[0];
}

async function modificarDocumento(idDocumento, datos) {
    const pool = await conectarBD();

    const request = pool.request();

    request.input('idDocumento', sql.Int, idDocumento);
    request.input('descripcion', sql.NVarChar(sql.MAX), datos.descripcion ?? null);
    request.input('fecha_documento', sql.DateTime2, datos.fecha_documento || null);
    request.input('expediente', sql.Int, datos.expediente);
    request.input('novedad', sql.Int, datos.novedad || null);

    let camposArchivo = '';

    if (datos.nombre_archivo && datos.storage_key) {
        request.input('nombre_archivo', sql.NVarChar(200), datos.nombre_archivo);
        request.input('storage_key', sql.NVarChar(sql.MAX), datos.storage_key);

        camposArchivo = `
            nombre_archivo = @nombre_archivo,
            storage_key = @storage_key,
        `;
    }

    const resultado = await request.query(`
        UPDATE documento
        SET
            descripcion = @descripcion,
            fecha_documento = @fecha_documento,
            expediente = @expediente,
            novedad = @novedad,
            ${camposArchivo}
            fecha_ultima_modificacion = SYSDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @idDocumento
    `);

    return resultado.recordset[0];
}

module.exports = {
    obtenerDocumentos,
    obtenerTodosLosDocumentos,
    existeExpediente,
    existeNovedad,
    existeUsuario,
    existeTipoDocumento,
    insertarDocumento,
    obtenerDocumentoPorId,
    eliminarDocumentoPorId,
    modificarDocumento
};