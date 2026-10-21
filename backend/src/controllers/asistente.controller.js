const asistenteService = require('../services/asistente.service');
const { pedidoLitisSchema } = require('../asistente/asistente.schemas');
const { responderError } = require('../asistente/errores');

// recibe un mensaje del chat y devuelve la respuesta de Litis con sus resultados
async function enviarMensaje(req, res) {
    const pedido = pedidoLitisSchema.safeParse(req.body);
    if (!pedido.success) {
        return res.status(400).json({ codigo: 'PEDIDO_INVALIDO', mensaje: 'El mensaje no es válido.' });
    }

    try {
        const respuesta = await asistenteService.conversar(pedido.data, req.usuario);
        res.json(respuesta);
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { enviarMensaje };
