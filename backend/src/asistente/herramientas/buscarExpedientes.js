const busquedaService = require('../../services/busqueda.service');
const { elegir, fechaIso, subtitulo, sinCriterios, usuarioIdDe } = require('./comun');

const CRITERIOS = ['texto', 'cliente', 'numeroCausa', 'estado', 'area', 'fechaDesde', 'fechaHasta'];

// busqueda de expedientes para Litis (HU35)
module.exports = {
    name: 'buscar_expedientes',
    description:
        'Busca expedientes por carátula, descripción o contraparte, por cliente, por número de causa judicial ' +
        'o número interno (EXP-año-id), por estado, área o fecha de inicio. Usala cuando el usuario pregunte ' +
        'por expedientes o causas, o cuando necesites el id de un expediente. Si se está trabajando sobre un ' +
        'expediente y el usuario no indica otro, llamala sin criterios para obtener los datos de ese expediente.',
    input_schema: {
        type: 'object',
        properties: {
            texto: { type: 'string', description: 'Palabras de la carátula, la descripción o la contraparte, o un número interno EXP-año-id.' },
            cliente: { type: 'string', description: 'Nombre, apellido, DNI o CUIT del cliente.' },
            numeroCausa: { type: 'string', description: 'Número de expediente judicial, por ejemplo "12345/2025".' },
            estado: { type: 'string', description: 'Estado del expediente, por ejemplo "En trámite".' },
            area: { type: 'string', description: 'Área del expediente, por ejemplo "Laboral".' },
            fechaDesde: { type: 'string', description: 'Fecha de inicio mínima, formato YYYY-MM-DD.' },
            fechaHasta: { type: 'string', description: 'Fecha de inicio máxima, formato YYYY-MM-DD.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25, por defecto 10).' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const criterios = elegir(input, CRITERIOS);
        const filtros = { ...criterios, usuarioId: usuarioIdDe(ctx), limite: input.limite };

        if (Object.keys(criterios).length === 0) {
            // en modo expediente (HU37), "este expediente" es el que esta abierto
            if (!ctx.expedienteId) return sinCriterios();
            filtros.expedienteId = ctx.expedienteId;
        }

        const expedientes = await busquedaService.buscarExpedientes(filtros);

        return {
            resumen: expedientes.map((e) => ({
                id: e.id,
                numero: e.numeroInterno,
                caratula: e.caratula,
                numeroCausa: e.numeroExpedienteJudicial,
                estado: e.estado,
                tipo: e.tipo,
                area: e.area,
                cliente: e.cliente,
                fechaInicio: fechaIso(e.fechaInicio),
            })),
            items: expedientes.map((e) => ({
                tipo: 'expediente',
                id: e.id,
                titulo: e.caratula,
                subtitulo: subtitulo(e.numeroInterno, e.estado, e.cliente),
                expedienteId: e.id,
                numeroExpediente: e.numeroInterno,
            })),
        };
    },
};
