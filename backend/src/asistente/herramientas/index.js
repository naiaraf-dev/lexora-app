// registro central de herramientas de Litis (HU33).
// para sumar una herramienta nueva alcanza con agregarla a esta lista: el ciclo no se toca.
//
// Cada herramienta exporta { name, description, input_schema, ejecutar(input, ctx) }
// y opcionalmente soloModoExpediente: true si solo tiene sentido dentro de un expediente.
const herramientas = [
    require('./pruebaBuscarExpedientes'),
    require('./leerDocumento'),
    // require('./buscarDocumentos'), require('./listarTareas'), ...
];

function armarRegistro(lista) {
    return {
        // lo que se le pasa a la IA
        definiciones: lista.map(({ name, description, input_schema }) => ({ name, description, input_schema })),
        // lo que usa el ciclo para ejecutar
        porNombre: Object.fromEntries(lista.map((h) => [h.name, h])),
    };
}

// herramientas habilitadas para el contexto de la conversacion
function disponibles(ctx = {}) {
    return armarRegistro(herramientas.filter((h) => !h.soloModoExpediente || ctx.expedienteId));
}

module.exports = { ...armarRegistro(herramientas), disponibles };
