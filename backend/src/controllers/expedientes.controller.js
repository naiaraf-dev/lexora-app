const service = require('../services/expedientes.service');

// lista expedientes aplicando los filtros que vienen por query
async function listar(req, res) {
    try {
        const filtros = {
            numero: req.query.numero,
            causa: req.query.causa,
            caratula: req.query.caratula,
            area: req.query.area,
            tipo: req.query.tipo,
            estado: req.query.estado,
            clienteId: req.query.clienteId,
            pagina: req.query.pagina ? Number(req.query.pagina) : 1,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : 25,
        };

        const resultado = await service.listar(filtros);
        res.json(resultado);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al listar expedientes',
            error: error.message,
        });
    }
}

// trae un expediente por id
async function obtener(req, res) {
    try {
        const { id } = req.params;
        const expediente = await service.obtener(Number(id));

        if (!expediente) {
            return res.status(404).json({ mensaje: 'Expediente no encontrado' });
        }

        res.json(expediente);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al obtener expediente',
            error: error.message,
        });
    }
}

// crea un expediente nuevo
async function crear(req, res) {
    try {
        const expediente = await service.crear(req.body);
        res.status(201).json(expediente);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al crear expediente',
            error: error.message,
        });
    }
}

// actualiza un expediente existente
async function actualizar(req, res) {
    try {
        const { id } = req.params;
        const expediente = await service.actualizar(Number(id), req.body);
        res.json(expediente);
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al actualizar expediente',
            error: error.message,
        });
    }
}

// elimina un expediente por id
async function eliminar(req, res) {
    try {
        const { id } = req.params;
        await service.eliminar(Number(id));
        res.json({ mensaje: 'Expediente eliminado correctamente' });
    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje: error.mensaje ?? 'Error al eliminar expediente',
            error: error.message,
        });
    }
}

// trae el historial de estados de un expediente
async function obtenerHistorial(req, res) {
    try {
        const { id } = req.params;

        const historial =
            await service.obtenerHistorial(Number(id));

        res.json(historial);

    } catch (error) {
        res.status(error.status ?? 500).json({
            mensaje:
                error.mensaje ??
                'Error al obtener historial del expediente',

            error: error.message
        });
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar,obtenerHistorial };