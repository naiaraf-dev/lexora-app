const service = require('../services/causa.service');

// lista todas las causas con sus expedientes agrupados
async function listar(req, res) {
    try {
        const filtros = {
            area:   req.query.area,
            numero: req.query.numero,
        };

        const causas = await service.listar(filtros);
        res.json(causas);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al listar causas',
            error:   error.message,
        });
    }
}

// trae una causa por id con sus expedientes
async function obtener(req, res) {
    try {
        const { id } = req.params;
        const causa = await service.obtener(Number(id));

        if (!causa) {
            return res.status(404).json({ mensaje: 'Causa no encontrada' });
        }

        res.json(causa);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al obtener causa',
            error:   error.message,
        });
    }
}

// elimina una causa por id (baja logica)
async function eliminar(req, res) {
    try {
        const { id } = req.params;
        await service.eliminar(Number(id));
        res.json({ mensaje: 'Causa eliminada correctamente' });
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al eliminar causa',
            error:   error.message,
        });
    }
}

module.exports = { listar, obtener, eliminar };