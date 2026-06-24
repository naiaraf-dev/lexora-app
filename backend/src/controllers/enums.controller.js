const service = require('../services/enums.service');

// intenta traer el mensaje personalizado, si falla usa uno por defecto
function obtenerMensajeError(enumName, tipo, fallback) {
    try {
        return service.obtenerMensaje(enumName, tipo);
    } catch {
        return fallback;
    }
}

// trae todos los valores del enum que llega por parametro
async function getAll(req, res) {
    const { enumName } = req.params;

    try {
        const data = await service.getAll(enumName);
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({
            mensaje: error.status === 404
                ? error.message
                : obtenerMensajeError(enumName, 'getError', 'Error al obtener enum'),
            error: error.message
        });
    }
}

// crea un nuevo valor para el enum indicado
async function create(req, res) {
    const { enumName } = req.params;

    try {
        const creado = await service.create(enumName, req.body);
        res.status(201).json(creado);
    } catch (error) {
        res.status(error.status || 500).json({
            mensaje: error.status === 400 || error.status === 404
                ? error.message
                : obtenerMensajeError(enumName, 'createError', 'Error al crear enum'),
            error: error.message
        });
    }
}

module.exports = {
    getAll,
    create
};