const service = require('./novedades_service');

async function listarPorExpediente(req, res) {
    try {
        const { id } = req.params;
        const novedades = await service.listarPorExpediente(Number(id));
        res.json(novedades);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al listar novedades',
            error:   error.message,
        });
    }
}

async function obtener(req, res) {
    try {
        const { id } = req.params;
        const novedad = await service.obtener(Number(id));

        if (!novedad) {
            return res.status(404).json({ mensaje: 'Novedad no encontrada' });
        }

        res.json(novedad);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al obtener novedad',
            error:   error.message,
        });
    }
}

async function crear(req, res) {
    try {
        const novedad = await service.crear(req.body);
        res.status(201).json(novedad);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al crear novedad',
            error:   error.message,
        });
    }
}

async function actualizar(req, res) {
    try {
        const { id } = req.params;
        const novedad = await service.actualizar(Number(id), req.body);
        res.json(novedad);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al actualizar novedad',
            error:   error.message,
        });
    }
}

async function eliminar(req, res) {
    try {
        const { id } = req.params;
        await service.eliminar(Number(id));
        res.json({ mensaje: 'Novedad eliminada correctamente' });
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al eliminar novedad',
            error:   error.message,
        });
    }
}

module.exports = { listarPorExpediente, obtener, crear, actualizar, eliminar };