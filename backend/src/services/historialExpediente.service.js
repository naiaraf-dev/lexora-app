const repo = require('../repositories/historialExpediente.repository');

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

async function registrarCambio(
    expedienteId,
    estadoExpedienteId,
    transaction = null
) {
    const expediente = validarId(
        expedienteId,
        'Expediente'
    );

    const estado = validarId(
        estadoExpedienteId,
        'Estado de expediente'
    );

    return repo.registrarCambio(
        expediente,
        estado,
        transaction
    );
}

async function obtenerPorExpediente(expedienteId) {
    const expediente = validarId(
        expedienteId,
        'Expediente'
    );

    return repo.obtenerPorExpediente(expediente);
}

module.exports = {
    registrarCambio,
    obtenerPorExpediente
};