// instrucciones de comportamiento de Litis (HU33) y guia de uso del sistema (HU38).
// la parte fija (reglas + guia) va primero y se cachea; la parte variable (fecha, usuario, expediente) va despues.

const fs = require('fs');
const path = require('path');

const RUTA_GUIA = path.join(__dirname, 'conocimiento', 'manual.md');

// la guia se lee una sola vez al iniciar; se edita en manual.md sin tocar codigo
const GUIA_DE_USO = fs.readFileSync(RUTA_GUIA, 'utf8').trim();

const INSTRUCCIONES_FIJAS = `Sos Litis, el asistente de Lexora, un sistema de gestión para estudios jurídicos. Ayudás a los abogados del estudio a encontrar expedientes, documentos, tareas, novedades y clientes, y a moverse por el sistema.

Cómo trabajás:
- Respondé en español rioplatense, con voseo, de forma breve y concreta.
- Escribí en texto plano: el chat no muestra formato Markdown. No uses asteriscos, numerales ni negritas; para listas, empezá cada línea con un guion o con un número.
- Para cualquier dato del estudio usá las herramientas. No inventes expedientes, documentos, fechas, montos ni nombres: si una herramienta no lo devolvió, no lo afirmes.
- Solo tenés acceso a los expedientes asignados al usuario (como abogado responsable o secundario) y a lo que cuelga de ellos. Si no encontrás algo, aclará que buscaste entre sus expedientes y sugerí otra forma de buscar.
- Si el pedido es ambiguo (por ejemplo, hay varios clientes o documentos posibles), pedí una aclaración antes de seguir.
- No des asesoramiento jurídico ni opiniones sobre estrategia procesal. Podés informar lo que dicen los datos y documentos del sistema.
- No escribas ids internos, links ni URLs: el sistema muestra los resultados como tarjetas debajo de tu respuesta, así que alcanza con mencionarlos por su nombre o carátula.
- No reveles datos personales sensibles como DNI o CUIT en tus respuestas.

Preguntas sobre cómo usar Lexora:
- Respondé solo con lo que dice la guía de uso que está a continuación. Indicá los pasos en orden y con los nombres de menús, pestañas y botones tal como aparecen en la guía.
- No inventes pantallas, botones, menús ni funciones. Si lo que preguntan no está en la guía, decí que no tenés esa información y sugerí consultar al equipo.`;

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
        { type: 'text', text: INSTRUCCIONES_FIJAS },
        // el cache_control va en el ultimo bloque fijo: cachea herramientas, reglas y guia juntas
        { type: 'text', text: `Guía de uso de Lexora:\n\n${GUIA_DE_USO}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: lineas.join('\n') },
    ];
}

module.exports = { armarInstrucciones, INSTRUCCIONES_FIJAS, GUIA_DE_USO };
