const tareasService = require('../services/tareas.service');

async function obtenerTareas(req, res) {
    try {
        const filtros = {
            idtarea: req.query.idtarea ? Number(req.query.idtarea) : undefined,
            titulo: req.query.titulo,
            descripcion: req.query.descripcion,
            nombreExpediente: req.query.nombreExpediente,
            expediente: req.query.expediente ? Number(req.query.expediente) : undefined,
            novedad: req.query.novedad ? Number(req.query.novedad) : undefined,
            prioridad: req.query.prioridad ? Number(req.query.prioridad) : undefined,
            estadoTarea: req.query.estadoTarea ? Number(req.query.estadoTarea) : undefined,
            usuarioCreacion: req.query.usuarioCreacion ? Number(req.query.usuarioCreacion) : undefined,
            usuarioCompletado: req.query.usuarioCompletado ? Number(req.query.usuarioCompletado) : undefined,
            fechaCreacion: req.query.fechaCreacion,
            fechaVencimiento: req.query.fechaVencimiento,
            activo: req.query.activo !== undefined
                ? req.query.activo === 'true' || req.query.activo === '1'
                : undefined
        };

        const tareas = await tareasService.obtenerTareas(filtros);

        res.json(tareas);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener tarea/s',
            error: error.message
        });
    }
}

async function obtenerTodasLasTareas(req, res) {
    try {
        const tareas = await tareasService.obtenerTodasLasTareas();

        res.json(tareas);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener todas las tareas',
            error: error.message
        });
    }
}

async function insertarTarea(req, res) {
    try {
        const tareaInsertada = await tareasService.insertarTarea(req.body);

        res.status(201).json({
            mensaje: 'Tarea insertada correctamente',
            tarea: tareaInsertada
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al insertar tarea'
        });
    }
}

async function modificarTarea(req, res) {
    try {
        const { idtarea } = req.params;

        const tareaModificada = await tareasService.modificarTarea(idtarea, req.body);

        res.json({
            mensaje: 'Tarea modificada correctamente',
            tarea: tareaModificada
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al modificar tarea'
        });
    }
}

async function eliminarTarea(req, res) {
    try {
        const { idtarea } = req.params;

        const tareaEliminada = await tareasService.eliminarTarea(idtarea);

        res.json({
            mensaje: 'Tarea eliminada correctamente',
            tarea: tareaEliminada
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            mensaje: error.message || 'Error al eliminar tarea'
        });
    }
}

module.exports = {
    obtenerTareas,
    obtenerTodasLasTareas,
    insertarTarea,
    modificarTarea,
    eliminarTarea
};