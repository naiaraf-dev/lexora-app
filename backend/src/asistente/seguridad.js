const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authMiddleware = require('../middlewares/auth.middleware');

// seguridad de las rutas de Litis (HU40): autenticacion y limites de uso con el formato del contrato

const NO_AUTENTICADO = { codigo: 'NO_AUTENTICADO', mensaje: 'Tenés que iniciar sesión para usar Litis.' };
const LIMITE_CONSULTAS = {
    codigo: 'LIMITE_CONSULTAS',
    mensaje: 'Hiciste muchas consultas seguidas. Esperá un minuto y volvé a intentar.',
};

// usa la misma validacion del token que el resto de la API, pero si falla responde
// con el formato de errores del contrato ({ codigo, mensaje }) en lugar de { mensaje }
function autenticacionLitis(req, res, next) {
    const respuestaNoAutenticado = {
        status: () => ({ json: () => res.status(401).json(NO_AUTENTICADO) }),
    };
    return authMiddleware(req, respuestaNoAutenticado, next);
}

function enteroPositivo(valor, porDefecto) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
}

/**
 * Limite de pedidos por usuario y por minuto. Va despues de autenticacionLitis:
 * cuenta por usuario logueado (no por IP, varias personas pueden compartir una red).
 * @param {number} porMinuto - pedidos permitidos por minuto
 */
function crearLimite(porMinuto) {
    return rateLimit({
        windowMs: 60 * 1000,
        limit: porMinuto,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req) => (req.usuario?.id ? `usuario:${req.usuario.id}` : ipKeyGenerator(req.ip)),
        handler: (req, res) => res.status(429).json(LIMITE_CONSULTAS),
    });
}

// cada consulta a la IA tiene costo: el limite de mensajes es mas bajo que el de enlaces de descarga
const limiteMensajes = crearLimite(enteroPositivo(process.env.LITIS_LIMITE_MENSAJES_POR_MINUTO, 10));
const limiteEnlaces = crearLimite(enteroPositivo(process.env.LITIS_LIMITE_ENLACES_POR_MINUTO, 30));

module.exports = { autenticacionLitis, crearLimite, limiteMensajes, limiteEnlaces, NO_AUTENTICADO, LIMITE_CONSULTAS };
