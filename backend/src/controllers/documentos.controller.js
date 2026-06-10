const documentosService = require('../services/documentos.service');

async function obtenerDocumentos(req, res) {
    try {
        const filtros = {
            iddocumento: req.query.iddocumento ? Number(req.query.iddocumento) : undefined,
            expediente: req.query.expediente ? Number(req.query.expediente) : undefined,
            nombreExpediente: req.query.nombreExpediente,
            tipoDocumento: req.query.tipoDocumento,
            fechaCreacion: req.query.fechaCreacion,
            fechaUltimaModificacion: req.query.fechaUltimaModificacion,
            nombreDocumento: req.query.nombreDocumento,
            activo: req.query.activo !== undefined ? req.query.activo === 'true' || req.query.activo === '1' : undefined
        };

        const documentos = await documentosService.obtenerDocumentos(filtros);

        res.json(documentos);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener documento/s',
            error: error.message
        });
    }
}

async function subirDocumento(req, res) {
    try {
        const documentoInsertado = await documentosService.subirEInsertarDocumento(req.body, req.file);

        res.status(201).json({
            mensaje: 'Documento subido e insertado correctamente',
            documento: documentoInsertado
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al subir documento'
        });
    }
}

async function descargarDocumento(req, res) {
    try {
        const { iddocumento } = req.params;

        const resultado = await documentosService.obtenerUrlDescargaDocumento(iddocumento);

        const response = await fetch(resultado.url);

        if (!response.ok) {
            const textoError = await response.text();

            return res.status(500).json({
                mensaje: 'No se pudo obtener el archivo desde Cloudinary',
                statusCloudinary: response.status,
                statusTextCloudinary: response.statusText,
                url: resultado.url,
                detalle: textoError
            });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const nombreArchivo = resultado.documento.nombre_archivo || 'documento';

        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`
        );

        return res.send(buffer);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al descargar documento'
        });
    }
}

async function obtenerTodosLosDocumentos(req, res) {
    try {
        const documentos = await documentosService.obtenerTodosLosDocumentos();

        res.json(documentos);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener todos los documentos',
            error: error.message
        });
    }
}

async function insertarDocumento(req, res) {
    try {
        const documentoInsertado = await documentosService.insertarDocumento(req.body);

        res.status(201).json({
            mensaje: 'Documento insertado correctamente',
            documento: documentoInsertado
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al insertar documento'
        });
    }
}

async function eliminarDocumento(req, res) {
    try {
        const { iddocumento } = req.params;

        const resultado = await documentosService.eliminarDocumento(iddocumento);

        res.json({
            mensaje: 'Documento eliminado correctamente',
            documento: resultado.documentoEliminado,
            cloudinary: resultado.cloudinary
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al eliminar documento',
            detalle: error.detalle || undefined
        });
    }
}

async function modificarDocumento(req, res) {
    try {
        const { iddocumento } = req.params;

        const resultado = await documentosService.modificarDocumento(
            iddocumento,
            req.body,
            req.file
        );

        res.json({
            mensaje: 'Documento modificado correctamente',
            documento: resultado.documentoModificado,
            cloudinary: resultado.cloudinary
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al modificar documento',
            detalle: error.detalle || undefined
        });
    }
}

module.exports = {
    obtenerDocumentos,
    obtenerTodosLosDocumentos,
    insertarDocumento,
    subirDocumento,
    descargarDocumento,
    eliminarDocumento,
    modificarDocumento
};