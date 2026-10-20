const Anthropic = require('@anthropic-ai/sdk');

// unico lugar que habla con el proveedor de IA (HU32).
// cambiar de modelo o de clave solo requiere tocar las variables de entorno.

const MODELO_POR_DEFECTO = 'claude-opus-5-5';
const MAX_TOKENS_POR_DEFECTO = 16000;

// modelos que aceptan el reintento automatico en otro modelo si el pedido es rechazado
const MODELOS_CON_FALLBACK = ['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'];
const BETA_FALLBACK = 'server-side-fallback-2026-07-01';

let cliente = null;

function configuracion() {
    const maxTokens = Number(process.env.LITIS_MAX_TOKENS);
    return {
        clave: process.env.ANTHROPIC_API_KEY?.trim() || null,
        modelo: process.env.LITIS_MODELO?.trim() || MODELO_POR_DEFECTO,
        maxTokens: Number.isInteger(maxTokens) && maxTokens > 0 ? maxTokens : MAX_TOKENS_POR_DEFECTO,
    };
}

// sin clave el backend arranca igual; Litis responde que no esta disponible
function estaDisponible() {
    return Boolean(configuracion().clave);
}

function obtenerCliente() {
    if (!cliente) {
        cliente = new Anthropic({ apiKey: configuracion().clave, timeout: 60_000, maxRetries: 2 });
    }
    return cliente;
}

// error con el formato del contrato de Litis
function errorNoDisponible() {
    const error = new Error('Litis no está disponible en este momento.');
    error.statusCode = 503;
    error.codigo = 'ASISTENTE_NO_DISPONIBLE';
    return error;
}

/**
 * Envia un pedido a la IA y devuelve el mensaje completo de respuesta.
 * @param {Object} pedido
 * @param {Array} pedido.system   - bloques de instrucciones
 * @param {Array} pedido.messages - conversacion en formato del proveedor
 * @param {Array} [pedido.tools]  - definiciones de herramientas
 */
async function enviar({ system, messages, tools }) {
    if (!estaDisponible()) throw errorNoDisponible();

    const { modelo, maxTokens } = configuracion();
    const parametros = { model: modelo, max_tokens: maxTokens, system, messages };
    if (tools?.length) parametros.tools = tools;

    try {
        if (MODELOS_CON_FALLBACK.includes(modelo)) {
            return await obtenerCliente().beta.messages.create({
                ...parametros,
                betas: [BETA_FALLBACK],
                fallbacks: 'default',
            });
        }
        return await obtenerCliente().messages.create(parametros);
    } catch (error) {
        // cualquier falla del proveedor (clave invalida, caida, limite) se informa igual al front
        if (error instanceof Anthropic.APIError) {
            console.error(`[litis] error del proveedor de IA (${error.status ?? 'sin conexión'}):`, error.message);
            throw errorNoDisponible();
        }
        throw error;
    }
}

module.exports = { enviar, estaDisponible, configuracion, errorNoDisponible };
