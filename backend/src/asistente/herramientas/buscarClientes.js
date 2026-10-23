const busquedaService = require('../../services/busqueda.service');
const { elegir, sinCriterios, usuarioIdDe } = require('./comun');

// busqueda de clientes para Litis (HU35)
module.exports = {
    name: 'buscar_clientes',
    description:
        'Busca clientes por nombre, apellido, DNI o CUIT. Usala para identificar a un cliente o para ' +
        'distinguir entre clientes con nombres parecidos antes de buscar sus expedientes o documentos. ' +
        'Si hay más de un cliente posible, mostrale las opciones al usuario y preguntale cuál es.',
    input_schema: {
        type: 'object',
        properties: {
            texto: { type: 'string', description: 'Nombre, apellido, DNI o CUIT del cliente.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25, por defecto 10).' },
        },
        required: ['texto'],
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const usuarioId = usuarioIdDe(ctx);
        const { texto } = elegir(input, ['texto']);
        if (!texto) return sinCriterios();

        // solo clientes con expedientes del usuario; la cantidad cuenta solo los suyos
        const clientes = await busquedaService.buscarClientes({ cliente: texto, usuarioId, limite: input.limite });

        return {
            // DNI y CUIT no se le envian a la IA
            resumen: clientes.map((c) => ({
                id: c.id,
                nombre: c.nombreCompleto,
                expedientesActivos: c.cantidadExpedientes,
            })),
            items: clientes.map((c) => ({
                tipo: 'cliente',
                id: c.id,
                titulo: c.nombreCompleto,
                subtitulo: `${c.cantidadExpedientes} ${c.cantidadExpedientes === 1 ? 'expediente activo' : 'expedientes activos'}`,
            })),
        };
    },
};
