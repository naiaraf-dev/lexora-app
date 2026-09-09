const repo = require('../repositories/tareasAutomaticas.repository');

function crearError(mensaje, status = 400) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

function validarId(valor, nombre) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        throw crearError(`${nombre} inválido`);
    }

    return numero;
}

// trae las tareas plantilla para consultar/configurar
async function obtenerPorTipoYEstado(tipoExpedienteId, estadoExpedienteId) {
    const tipo = validarId(tipoExpedienteId, 'Tipo de expediente');
    const estado = validarId(estadoExpedienteId, 'Estado de expediente');

    return repo.obtenerPorTipoYEstado(tipo, estado);
}

// obtiene el estado inicial del tipo
async function obtenerPrimerEstado(tipoExpedienteId) {
    const tipo = validarId(tipoExpedienteId, 'Tipo de expediente');

    const estado = await repo.obtenerPrimerEstado(tipo);

    if (!estado) {
        throw crearError(
            'El tipo de expediente no tiene estados configurados',
            400
        );
    }

    return estado;
}

// valida que un estado pertenezca al tipo
async function validarEstadoPermitido(
    tipoExpedienteId,
    estadoExpedienteId,
    transaction = null
) {
    const tipo = validarId(tipoExpedienteId, 'Tipo de expediente');
    const estado = validarId(estadoExpedienteId, 'Estado de expediente');

    const permitido = await repo.estadoPermitido(
        tipo,
        estado,
        transaction
    );

    if (!permitido) {
        throw crearError(
            'El estado seleccionado no es válido para este tipo de expediente'
        );
    }

    return true;
}

// genera las tareas correspondientes a un ingreso de estado
async function generarTareasAutomaticas(
    {
        expedienteId,
        tipoExpedienteId,
        estadoExpedienteId,
        usuarioCreacionId,
        prioridadId
    },
    transaction
) {
    const expediente = validarId(expedienteId, 'Expediente');
    const tipo = validarId(tipoExpedienteId, 'Tipo de expediente');
    const estado = validarId(estadoExpedienteId, 'Estado de expediente');
    const usuario = validarId(
        usuarioCreacionId,
        'Usuario de creación de las tareas'
    );
    const prioridad = validarId(prioridadId, 'Prioridad');

    await validarEstadoPermitido(tipo, estado, transaction);

    const usuarioExiste = await repo.existeUsuario(usuario, transaction);

    if (!usuarioExiste) {
        throw crearError(
            `No existe un usuario con id ${usuario}`
        );
    }

    const prioridadExiste = await repo.existePrioridad(
        prioridad,
        transaction
    );

    if (!prioridadExiste) {
        throw crearError(
            `No existe una prioridad con id ${prioridad}`
        );
    }

    const tareas = await repo.generarTareas(
        {
            expedienteId: expediente,
            tipoExpedienteId: tipo,
            estadoExpedienteId: estado,
            usuarioCreacionId: usuario,
            prioridadId: prioridad
        },
        transaction
    );

    // Todos tus estados configurados actualmente tienen tareas en el Excel.
    // Si devuelve cero, significa que falta configuracion.
    if (!tareas.length) {
        throw crearError(
            'No hay tareas automáticas configuradas para este tipo y estado',
            500
        );
    }

    return tareas;
}

module.exports = {
    obtenerPorTipoYEstado,
    obtenerPrimerEstado,
    validarEstadoPermitido,
    generarTareasAutomaticas
};