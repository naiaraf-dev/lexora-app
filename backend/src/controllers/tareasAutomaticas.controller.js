const service = require('../services/tareasAutomaticas.service');

// trae las tareas automaticas configuradas para tipo + estado
async function obtenerPorTipoYEstado(req, res) {
    try {
        const {
            tipoExpedienteId,
            estadoExpedienteId
        } = req.params;

        const tareas = await service.obtenerPorTipoYEstado(
            tipoExpedienteId,
            estadoExpedienteId
        );

        res.json(tareas);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje:
                error.message ??
                'Error al obtener tareas automáticas'
        });
    }
}

module.exports = {
    obtenerPorTipoYEstado
};