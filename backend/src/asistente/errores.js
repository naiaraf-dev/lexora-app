// errores con el formato del contrato de Litis ({ codigo, mensaje })

function errorLitis(statusCode, codigo, mensaje) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    error.codigo = codigo;
    return error;
}

// responde el error del contrato, sin detalles internos
function responderError(res, error) {
    if (error.codigo) {
        return res.status(error.statusCode).json({ codigo: error.codigo, mensaje: error.message });
    }

    console.error('[litis] error inesperado:', error.message);
    return res.status(500).json({
        codigo: 'ERROR_INTERNO',
        mensaje: 'Ocurrió un error. Probá de nuevo en unos minutos.',
    });
}

module.exports = { errorLitis, responderError };
