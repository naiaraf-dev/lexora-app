const documentosService = require('../services/documentos.service');

async function obtenerDocumentos(req, res) {
    console.log('Endpoint ejecutado: GET /api/documento');

    try {
        const filtros = {
            iddocumento: req.query.iddocumento ? Number(req.query.iddocumento) : undefined,
            nombreExpediente: req.query.nombreExpediente,
            tipoDocumento: req.query.tipoDocumento,
            fechaCreacion: req.query.fechaCreacion,
            fechaUltimaModificacion: req.query.fechaUltimaModificacion,
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

async function obtenerTodosLosDocumentos(req, res) {
    console.log('Endpoint ejecutado: GET /api/documentos');

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
    console.log('Endpoint ejecutado: POST /api/insertarDocumento');

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

module.exports = {
    obtenerDocumentos,
    obtenerTodosLosDocumentos,
    insertarDocumento
};