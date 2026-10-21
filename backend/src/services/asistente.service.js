const llm = require('../config/llm');
const expedientesRepository = require('../repositories/expedientes.repository');
const herramientas = require('../asistente/herramientas');
const { armarInstrucciones } = require('../asistente/instrucciones');
const { resultadoLitisSchema } = require('../asistente/asistente.schemas');
const { errorLitis } = require('../asistente/errores');

const MAX_ITERACIONES_POR_DEFECTO = 5;
const MAX_MENSAJES_HISTORIAL = 10;
const FORMATO_CONTEXTO = /^EXP-(\d{4})-(\d+)$/;

const MENSAJE_LIMITE_ITERACIONES =
    'Necesité demasiados pasos para responder y frené acá. ¿Podés hacer la pregunta más concreta?';
const MENSAJE_RECHAZO = 'No puedo ayudarte con ese pedido.';
const MENSAJE_SIN_TEXTO = 'No pude armar una respuesta. ¿Podés reformular la pregunta?';

function maxIteraciones() {
    const valor = Number(process.env.LITIS_MAX_ITERACIONES);
    return Number.isInteger(valor) && valor > 0 ? valor : MAX_ITERACIONES_POR_DEFECTO;
}

// convierte el numero interno (EXP-año-id) en el expediente real (HU37)
async function resolverContexto(contexto) {
    if (!contexto) return null;

    const [, anio, id] = FORMATO_CONTEXTO.exec(contexto) ?? [];
    const expediente = id ? await expedientesRepository.getById(Number(id)) : null;

    // getById ya descarta los dados de baja; el año tiene que coincidir con el numero interno
    if (!expediente || new Date(expediente.fecha_creacion).getFullYear() !== Number(anio)) {
        throw errorLitis(404, 'NO_ENCONTRADO', `No encontré el expediente ${contexto}.`);
    }

    return {
        id: expediente.id,
        numero: contexto,
        caratula: expediente.caratula,
        cliente: expediente.clienteNombre?.trim() || null,
    };
}

// historial del front (usuario / litis) al formato de la IA, limitado para controlar el costo
function convertirHistorial(historial = []) {
    const mensajes = historial
        .slice(-MAX_MENSAJES_HISTORIAL)
        .map(({ autor, texto }) => ({ role: autor === 'usuario' ? 'user' : 'assistant', content: texto }));

    // la conversacion con la IA tiene que empezar con el usuario (se descarta el saludo de Litis)
    while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
    return mensajes;
}

function textoDe(respuesta) {
    return respuesta.content
        .filter((bloque) => bloque.type === 'text')
        .map((bloque) => bloque.text)
        .join('\n')
        .trim();
}

// agrega a los resultados los items validos de una herramienta, sin repetir
function acumularItems(resultados, items = []) {
    for (const item of items) {
        const valido = resultadoLitisSchema.safeParse(item);
        if (!valido.success) continue;
        const clave = `${valido.data.tipo}-${valido.data.id}`;
        if (!resultados.has(clave)) resultados.set(clave, valido.data);
    }
}

// ejecuta una herramienta y arma el tool_result para la IA
async function ejecutarHerramienta(bloque, registro, ctx, resultados) {
    const herramienta = registro.porNombre[bloque.name];
    if (!herramienta) {
        return { type: 'tool_result', tool_use_id: bloque.id, is_error: true, content: 'Herramienta desconocida.' };
    }

    try {
        const { resumen, items, contenido } = await herramienta.ejecutar(bloque.input ?? {}, ctx);
        acumularItems(resultados, items);

        const textoResumen = { type: 'text', text: JSON.stringify(resumen ?? []) };
        return {
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: contenido?.length ? [...contenido, textoResumen] : [textoResumen],
        };
    } catch (error) {
        // los errores del contrato se le explican a la IA; los inesperados no exponen detalles
        if (!error.codigo) console.error(`[litis] fallo la herramienta ${bloque.name}:`, error.message);
        return {
            type: 'tool_result',
            tool_use_id: bloque.id,
            is_error: true,
            content: error.codigo ? error.message : 'No se pudo completar la consulta.',
        };
    }
}

/**
 * Ciclo de conversacion con herramientas (HU33).
 * @param {Object} pedido - { mensaje, contexto, historial } validado con pedidoLitisSchema
 * @param {Object} usuario - req.usuario
 * @returns {Promise<{ respuesta: string, resultados: Object[] }>}
 */
async function conversar({ mensaje, contexto, historial }, usuario) {
    // sin clave configurada no tiene sentido resolver nada mas
    if (!llm.estaDisponible()) throw llm.errorNoDisponible();

    const expediente = await resolverContexto(contexto);
    const ctx = { usuario, expedienteId: expediente?.id, numeroExpediente: expediente?.numero };

    const registro = herramientas.disponibles(ctx);
    const system = armarInstrucciones({ usuario, expediente });
    const messages = [...convertirHistorial(historial), { role: 'user', content: mensaje }];
    const resultados = new Map();
    const conResultados = (respuesta) => ({ respuesta, resultados: [...resultados.values()] });

    for (let vuelta = 0; vuelta < maxIteraciones(); vuelta++) {
        const respuesta = await llm.enviar({ system, messages, tools: registro.definiciones });

        if (respuesta.stop_reason === 'refusal') return conResultados(MENSAJE_RECHAZO);

        const usos = respuesta.content.filter((bloque) => bloque.type === 'tool_use');

        // una herramienta cortada por max_tokens no se ejecuta con datos incompletos
        if (respuesta.stop_reason !== 'tool_use' || usos.length === 0) {
            return conResultados(textoDe(respuesta) || MENSAJE_SIN_TEXTO);
        }

        messages.push({ role: 'assistant', content: respuesta.content });

        // todas las herramientas de la vuelta se ejecutan juntas y vuelven en un solo mensaje
        const toolResults = await Promise.all(
            usos.map((bloque) => ejecutarHerramienta(bloque, registro, ctx, resultados))
        );
        messages.push({ role: 'user', content: toolResults });
    }

    return conResultados(MENSAJE_LIMITE_ITERACIONES);
}

module.exports = {
    conversar,
    // se exportan para tests
    resolverContexto,
    convertirHistorial,
    MENSAJE_LIMITE_ITERACIONES,
};
