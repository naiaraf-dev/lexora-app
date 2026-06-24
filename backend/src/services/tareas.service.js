const tareasRepository = require('../repositories/tareas.repository');

// crea un error con mensaje y codigo de estado
function crearError(mensaje, statusCode = 400) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

// valida que existan las relaciones necesarias para crear o modificar una tarea
async function validarRelacionesTarea(datos, esAlta = true) {
    const {
        expediente,
        novedad,
        usuario_creacion,
        usuario_completado,
        prioridad,
        estado_tarea
    } = datos;

    // valida campos obligatorios
    if (!expediente) {
        throw crearError('El expediente es obligatorio');
    }

    if (esAlta && !usuario_creacion) {
        throw crearError('El usuario de creación es obligatorio');
    }

    if (!prioridad) {
        throw crearError('La prioridad es obligatoria');
    }

    if (!estado_tarea) {
        throw crearError('El estado de la tarea es obligatorio');
    }

    const expedienteExiste = await tareasRepository.existeExpediente(Number(expediente));

    if (!expedienteExiste) {
        throw crearError(`No existe un expediente con id ${expediente}`);
    }

    // si viene una novedad asociada, valida que exista
    if (novedad) {
        const novedadExiste = await tareasRepository.existeNovedad(Number(novedad));

        if (!novedadExiste) {
            throw crearError(`No existe una novedad con id ${novedad}`);
        }
    }

    if (usuario_creacion) {
        const usuarioCreacionExiste = await tareasRepository.existeUsuario(Number(usuario_creacion));

        if (!usuarioCreacionExiste) {
            throw crearError(`No existe un usuario de creación con id ${usuario_creacion}`);
        }
    }

    if (usuario_completado) {
        const usuarioCompletadoExiste = await tareasRepository.existeUsuario(Number(usuario_completado));

        if (!usuarioCompletadoExiste) {
            throw crearError(`No existe un usuario completado con id ${usuario_completado}`);
        }
    }

    const prioridadExiste = await tareasRepository.existePrioridad(Number(prioridad));

    if (!prioridadExiste) {
        throw crearError(`No existe una prioridad con id ${prioridad}`);
    }

    const estadoTareaExiste = await tareasRepository.existeEstadoTarea(Number(estado_tarea));

    if (!estadoTareaExiste) {
        throw crearError(`No existe un estado de tarea con id ${estado_tarea}`);
    }
}

// trae tareas con los filtros recibidos
async function obtenerTareas(filtros) {
    return await tareasRepository.obtenerTareas(filtros);
}

// trae todas las tareas
async function obtenerTodasLasTareas() {
    return await tareasRepository.obtenerTodasLasTareas();
}

// valida los datos y crea una tarea nueva
async function insertarTarea(datos) {
    const {
        titulo,
        descripcion,
        expediente,
        novedad,
        usuario_creacion,
        usuario_completado,
        prioridad,
        estado_tarea,
        fecha_vencimiento,
        hora,
    } = datos;

    if (!titulo || !titulo.trim()) {
        throw crearError('El título de la tarea es obligatorio');
    }

    await validarRelacionesTarea(datos, true);

    const tarea = {
        titulo: titulo.trim(),
        descripcion,
        expediente: Number(expediente),
        novedad: novedad ? Number(novedad) : null,
        usuario_creacion: Number(usuario_creacion),
        usuario_completado: usuario_completado ? Number(usuario_completado) : null,
        prioridad: Number(prioridad),
        estado_tarea: Number(estado_tarea),
        fecha_vencimiento: fecha_vencimiento || null,
        hora: hora || null
    };

    return await tareasRepository.insertarTarea(tarea);
}

// valida que exista y modifica una tarea
async function modificarTarea(idTarea, datos) {
    if (!idTarea || isNaN(Number(idTarea))) {
        throw crearError('El id de la tarea es obligatorio y debe ser numérico');
    }

    const tareaActual = await tareasRepository.obtenerTareaPorId(Number(idTarea));

    if (!tareaActual) {
        throw crearError(`No existe una tarea con id ${idTarea}`, 404);
    }

    const {
        titulo,
        descripcion,
        expediente,
        novedad,
        usuario_completado,
        prioridad,
        estado_tarea,
        fecha_vencimiento,
        hora,
    } = datos;

    if (!titulo || !titulo.trim()) {
        throw crearError('El título de la tarea es obligatorio');
    }

    await validarRelacionesTarea(datos, false);

    const tarea = {
        titulo: titulo.trim(),
        descripcion,
        expediente: Number(expediente),
        novedad: novedad ? Number(novedad) : null,
        usuario_completado: usuario_completado ? Number(usuario_completado) : null,
        prioridad: Number(prioridad),
        estado_tarea: Number(estado_tarea),
        fecha_vencimiento: fecha_vencimiento || null,
        hora: hora || null
    };

    return await tareasRepository.modificarTarea(Number(idTarea), tarea);
}

// valida que exista y elimina la tarea
async function eliminarTarea(idTarea) {
    if (!idTarea || isNaN(Number(idTarea))) {
        throw crearError('El id de la tarea es obligatorio y debe ser numérico');
    }

    const tarea = await tareasRepository.obtenerTareaPorId(Number(idTarea));

    if (!tarea) {
        throw crearError(`No existe una tarea con id ${idTarea}`, 404);
    }

    return await tareasRepository.eliminarTareaPorId(Number(idTarea));
}

module.exports = {
    obtenerTareas,
    obtenerTodasLasTareas,
    insertarTarea,
    modificarTarea,
    eliminarTarea
};