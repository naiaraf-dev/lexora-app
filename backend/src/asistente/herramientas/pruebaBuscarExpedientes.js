const busquedaService = require('../../services/busqueda.service');

// herramienta de prueba del ciclo (HU33): busca expedientes con la busqueda existente.
// queda hasta que se conecten las herramientas reales (HU35 / HU36).
module.exports = {
    name: 'prueba_buscar_expedientes',
    description:
        'Busca expedientes del estudio por carátula, cliente o estado. ' +
        'Usala cuando el usuario pregunte por expedientes o quiera datos de uno. ' +
        'Si se está trabajando sobre un expediente y el usuario no indica otro, no hace falta pasar criterios.',
    input_schema: {
        type: 'object',
        properties: {
            texto: { type: 'string', description: 'Texto de la carátula o número de expediente (EXP-año-id).' },
            cliente: { type: 'string', description: 'Nombre o apellido del cliente.' },
            estado: { type: 'string', description: 'Estado del expediente.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25).' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const filtros = { texto: input.texto, cliente: input.cliente, estado: input.estado, limite: input.limite };
        const sinCriterios = !filtros.texto && !filtros.cliente && !filtros.estado;

        // en modo expediente (HU37), "este expediente" es el que esta abierto
        if (sinCriterios && ctx.expedienteId) filtros.expedienteId = ctx.expedienteId;

        const expedientes = await busquedaService.buscarExpedientes(filtros);

        return {
            resumen: expedientes.map((e) => ({
                id: e.id,
                numero: e.numeroInterno,
                caratula: e.caratula,
                estado: e.estado,
                tipo: e.tipo,
                cliente: e.cliente,
            })),
            items: expedientes.map((e) => ({
                tipo: 'expediente',
                id: e.id,
                titulo: e.caratula,
                subtitulo: [e.numeroInterno, e.estado, e.cliente].filter(Boolean).join(' · '),
                expedienteId: e.id,
                numeroExpediente: e.numeroInterno,
            })),
        };
    },
};
