const asistenteService = require('../services/asistente.service');
const { pedidoLitisSchema } = require('../asistente/asistente.schemas');
const { responderError } = require('../asistente/errores');
const auditoria = require('../asistente/auditoria');

// recibe un mensaje del chat y devuelve la respuesta de Litis con sus resultados
async function enviarMensaje(req, res) {
    const pedido = pedidoLitisSchema.safeParse(req.body);
    if (!pedido.success) {
        return res.status(400).json({ codigo: 'PEDIDO_INVALIDO', mensaje: 'El mensaje no es válido.' });
    }

    try {
        const { respuesta, resultados, herramientasUsadas } = await asistenteService.conversar(pedido.data, req.usuario);
        await auditoria.registrarConsulta(req, pedido.data, { resultados, herramientasUsadas });
        // herramientasUsadas es solo para el log: el contrato con el front es { respuesta, resultados }
        res.json({ respuesta, resultados });
    } catch (error) {
        await auditoria.registrarConsulta(req, pedido.data, undefined, error);
        responderError(res, error);
    }
}

module.exports = { enviarMensaje };
