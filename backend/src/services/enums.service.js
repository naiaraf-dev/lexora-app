const repo = require('../repositories/enums.repository');

// mensajes personalizados para cada enum
const mensajes = {
    tipocliente: {
        getError: 'Error al obtener tipos de cliente',
        createError: 'Error al crear tipo de cliente'
    },
    rolcliente: {
        getError: 'Error al obtener roles de cliente',
        createError: 'Error al crear rol de cliente'
    },
    rolusuario: {
        getError: 'Error al obtener roles de usuario',
        createError: 'Error al crear rol de usuario'
    },
    tipoexpediente: {
        getError: 'Error al obtener tipos de expediente',
        createError: 'Error al crear tipo de expediente'
    },
    tipodocumento: {
        getError: 'Error al obtener tipos de documento',
        createError: 'Error al crear tipo de documento'
    },
    tiponovedad: {
        getError: 'Error al obtener tipos de novedad',
        createError: 'Error al crear tipo de novedad'
    },
    estadotarea: {
        getError: 'Error al obtener estados de tarea',
        createError: 'Error al crear estado de tarea'
    },
    estadoexpediente: {
        getError: 'Error al obtener estados de expediente',
        createError: 'Error al crear estado de expediente'
    },
    prioridad: {
        getError: 'Error al obtener prioridades',
        createError: 'Error al crear prioridad'
    }
};

// valida que el enum exista dentro de los permitidos
function validarEnum(nombreEnum) {
    if (!mensajes[nombreEnum]) {
        const error = new Error('Enum no encontrado');
        error.status = 404;
        throw error;
    }
}

// devuelve el mensaje de error correspondiente al enum
function obtenerMensaje(nombreEnum, tipo) {
    validarEnum(nombreEnum);
    return mensajes[nombreEnum][tipo];
}

// trae todos los valores del enum
async function getAll(nombreEnum) {
    validarEnum(nombreEnum);
    return repo.getAll(nombreEnum);
}

// valida el nombre y crea un valor nuevo para el enum
async function create(nombreEnum, datos) {
    validarEnum(nombreEnum);

    if (!datos.nombre || !datos.nombre.trim()) {
        const error = new Error('El nombre es obligatorio');
        error.status = 400;
        throw error;
    }

    return repo.create(nombreEnum, datos.nombre);
}

// trae los estados posibles para un tipo de expediente, ordenados
async function getEstadosPorTipoExpediente(tipoExpedienteId) {
    const id = Number(tipoExpedienteId);

    if (!Number.isInteger(id)) {
        const error = new Error('Tipo de expediente inválido');
        error.status = 400;
        throw error;
    }

    return repo.getEstadosPorTipoExpediente(id);
}

module.exports = {
    getAll,
    create,
    obtenerMensaje,
    getEstadosPorTipoExpediente
};