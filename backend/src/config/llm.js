const Anthropic = require('@anthropic-ai/sdk');

// unico lugar que habla con el proveedor de IA (HU32).
// cambiar de modelo o de clave solo requiere tocar las variables de entorno.

const MODELO_POR_DEFECTO = 'claude-sonnet-5-5';
const MAX_TOKENS_POR_DEFECTO = 16000;
const TIMEOUT_SEGUNDOS_POR_DEFECTO = 120;

// un solo reintento: cada reintento vuelve a pagar todos los tokens de entrada
// (instrucciones, historial y documentos leidos) y suma espera para el usuario
const MAX_REINTENTOS = 1;

// modelos que aceptan el reintento automatico en otro modelo si el pedido es rechazado
const MODELOS_CON_FALLBACK = ['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'];
const BETA_FALLBACK = 'server-side-fallback-2026-07-01';

let cliente = null;

function enteroPositivo(valor, porDefecto) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
}

function configuracion() {
    return {
        clave: process.env.ANTHROPIC_API_KEY?.trim() || null,
        modelo: process.env.LITIS_MODELO?.trim() || MODELO_POR_DEFECTO,
        maxTokens: enteroPositivo(process.env.LITIS_MAX_TOKENS, MAX_TOKENS_POR_DEFECTO),
        timeoutSegundos: enteroPositivo(process.env.LITIS_TIMEOUT_SEGUNDOS, TIMEOUT_SEGUNDOS_POR_DEFECTO),
    };
}

// sin clave el backend arranca igual; Litis responde que no esta disponible
function estaDisponible() {
    return Boolean(configuracion().clave);
}

function obtenerCliente() {
    if (!cliente) {
        const { clave, timeoutSegundos } = configuracion();
        cliente = new Anthropic({ apiKey: clave, timeout: timeoutSegundos * 1000, maxRetries: MAX_REINTENTOS });
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
 * @param {Object} [pedido.outputConfig] - por ejemplo { format: { type: 'json_schema', schema } } para respuestas con estructura fija
 */
async function enviar({ system, messages, tools, outputConfig }) {
    if (!estaDisponible()) throw errorNoDisponible();

    const { modelo, maxTokens } = configuracion();
    const parametros = { model: modelo, max_tokens: maxTokens, system, messages };
    if (tools?.length) parametros.tools = tools;
    if (outputConfig) parametros.output_config = outputConfig;

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
        if (!(error instanceof Anthropic.APIError)) throw error;

        // sin conexion, timeout, clave invalida, limite o caida del proveedor: Litis no esta disponible
        if (esFallaDelProveedor(error.status)) {
            console.error(`[litis] error del proveedor de IA (${error.status ?? 'sin conexión'}):`, error.message);
            throw errorNoDisponible();
        }

        // el proveedor rechazo el pedido (400, 404...): es un error de configuracion o del codigo,
        // no una caida; sale como ERROR_INTERNO y queda en el log con el detalle para corregirlo
        console.error(
            `[litis] el proveedor de IA rechazó el pedido (${error.status}). ` +
            `Revisar LITIS_MODELO (${modelo}) y el armado del pedido:`, error.message
        );
        throw error;
    }
}

function esFallaDelProveedor(status) {
    return status === undefined || status === 401 || status === 403 || status === 429 || status >= 500;
}

module.exports = { enviar, estaDisponible, configuracion, errorNoDisponible, esFallaDelProveedor };
