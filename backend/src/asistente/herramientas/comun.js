// funciones comunes de las herramientas de Litis

const { errorLitis } = require('../errores');

// toma solo los campos permitidos que vengan con valor (la IA puede mandar campos de mas);
// los textos se recortan y los que quedan vacios se descartan
function elegir(input, campos) {
    const elegidos = {};

    for (const campo of campos) {
        const valor = typeof input[campo] === 'string' ? input[campo].trim() : input[campo];
        if (valor !== undefined && valor !== null && valor !== '') elegidos[campo] = valor;
    }

    return elegidos;
}

// fecha corta para la IA: 2025-03-14
function fechaIso(fecha) {
    if (!fecha) return undefined;
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime()) ? undefined : valor.toISOString().slice(0, 10);
}

// fecha para las tarjetas del front: 14/03/2025
function fechaCorta(fecha) {
    const iso = fechaIso(fecha);
    if (!iso) return undefined;
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
}

// subtitulo de una tarjeta con las partes que tengan valor
function subtitulo(...partes) {
    return partes.filter(Boolean).join(' · ') || undefined;
}

// acorta un texto largo antes de pasarselo a la IA
function recortar(texto, largo) {
    if (!texto) return undefined;
    return texto.length > largo ? `${texto.slice(0, largo).trimEnd()}…` : texto;
}

// usuario de la sesion: las busquedas se limitan a sus expedientes.
// sin usuario no se busca nada (nunca se busca sin restriccion)
function usuarioIdDe(ctx = {}) {
    const id = ctx.usuario?.id;
    if (!Number.isInteger(id) || id <= 0) {
        throw errorLitis(401, 'NO_AUTENTICADO', 'Tenés que iniciar sesión para usar Litis.');
    }
    return id;
}

// respuesta para la IA cuando no llega ningun criterio de busqueda
function sinCriterios() {
    return {
        resumen: { aviso: 'No se indicó ningún criterio de búsqueda. Pedile al usuario un dato para buscar.' },
        items: [],
    };
}

module.exports = { elegir, fechaIso, fechaCorta, subtitulo, sinCriterios, recortar, usuarioIdDe };
