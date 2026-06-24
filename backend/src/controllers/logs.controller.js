const service = require('../services/logs.service');

// lista los logs aplicando filtros y paginacion
async function listar(req, res) {
    try {
        const filtros = {
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta,
            usuario: req.query.usuario,
            modulo: req.query.modulo,
            accion: req.query.accion,
            resultado: req.query.resultado,
            pagina: req.query.pagina ? Number(req.query.pagina) : 1,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
        };
        const resultado = await service.listar(filtros);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al listar logs', error: error.message });
    }
}

// trae un log puntual por id
async function obtener(req, res) {
    try {
        const log = await service.obtener(Number(req.params.id));
        if (!log) return res.status(404).json({ mensaje: 'Log no encontrado' });
        res.json(log);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener log', error: error.message });
    }
}

// trae estadisticas de logs segun el rango de fechas
async function stats(req, res) {
    try {
        const resultado = await service.getStats({
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener stats', error: error.message });
    }
}

// trae los usuarios que aparecen en los logs
async function usuarios(req, res) {
    try {
        const resultado = await service.getUsuarios();
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener usuarios', error: error.message });
    }
}

module.exports = { listar, obtener, stats, usuarios };