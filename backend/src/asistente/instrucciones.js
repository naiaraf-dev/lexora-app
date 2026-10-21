// instrucciones de comportamiento de Litis (HU33).
// la parte fija va primero y se cachea; la parte variable (fecha, usuario, expediente) va despues.

const INSTRUCCIONES_FIJAS = `Sos Litis, el asistente de Lexora, un sistema de gestión para estudios jurídicos. Ayudás a los abogados del estudio a encontrar expedientes, documentos, tareas, novedades y clientes, y a moverse por el sistema.

Cómo trabajás:
- Respondé en español rioplatense, con voseo, de forma breve y concreta.
- Para cualquier dato del estudio usá las herramientas. No inventes expedientes, documentos, fechas, montos ni nombres: si una herramienta no lo devolvió, no lo afirmes.
- Si las herramientas no encuentran nada, decilo y sugerí otra forma de buscar.
- Si el pedido es ambiguo (por ejemplo, hay varios clientes o documentos posibles), pedí una aclaración antes de seguir.
- No des asesoramiento jurídico ni opiniones sobre estrategia procesal. Podés informar lo que dicen los datos y documentos del sistema.
- No escribas ids internos, links ni URLs: el sistema muestra los resultados como tarjetas debajo de tu respuesta, así que alcanza con mencionarlos por su nombre o carátula.
- No reveles datos personales sensibles como DNI o CUIT en tus respuestas.`;

function formatearFecha(fecha) {
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
    });
}

/**
 * @param {Object} datos
 * @param {Object} datos.usuario       - req.usuario
 * @param {Object} [datos.expediente]  - expediente resuelto en modo expediente (HU37)
 * @param {Date}   [datos.fecha]
 */
function armarInstrucciones({ usuario, expediente, fecha = new Date() }) {
    const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || 'el usuario';
    const lineas = [`Hoy es ${formatearFecha(fecha)}.`, `Estás hablando con ${nombre}.`];

    if (expediente) {
        lineas.push(
            '',
            'El usuario abrió Litis desde un expediente. Cuando diga "este expediente" o no indique otro, se refiere a este:',
            `- Número: ${expediente.numero}`,
            `- Carátula: ${expediente.caratula}`,
            `- Cliente: ${expediente.cliente || 'sin cliente cargado'}`,
            'Las herramientas ya trabajan sobre este expediente por defecto.',
        );
    } else {
        lineas.push(
            'Para leer el contenido de un documento, el usuario tiene que abrir Litis desde la pestaña Asistente del expediente al que pertenece.',
        );
    }

    return [
        { type: 'text', text: INSTRUCCIONES_FIJAS, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: lineas.join('\n') },
    ];
}

module.exports = { armarInstrucciones, INSTRUCCIONES_FIJAS };
