const busquedaService = require('../../services/busqueda.service');
const { elegir, fechaIso, fechaCorta, subtitulo, sinCriterios, recortar, usuarioIdDe } = require('./comun');

const CRITERIOS = ['texto', 'cliente', 'numeroCausa', 'expedienteId', 'fechaDesde', 'fechaHasta'];

// novedades (movimientos) de los expedientes para Litis (HU36)
module.exports = {
    name: 'listar_novedades',
    description:
        'Lista las novedades de los expedientes: audiencias, presentaciones, notificaciones, vencimientos, ' +
        'llamadas, reuniones y observaciones. Vienen ordenadas por fecha, de la más reciente a la más antigua. ' +
        'Algunas pueden tener fecha futura (por ejemplo, una audiencia ya fijada): compará con la fecha de hoy ' +
        'para distinguir lo que ya pasó de lo que está programado. Usala cuando el usuario pregunte qué pasó en un expediente, cuál fue ' +
        'el último movimiento o qué novedades hubo en un período. Si se está trabajando sobre un expediente y ' +
        'el usuario no indica otro expediente ni otro cliente, se listan las de ese expediente.',
    input_schema: {
        type: 'object',
        properties: {
            texto: { type: 'string', description: 'Palabras del título, la descripción o el tipo de novedad, por ejemplo "audiencia".' },
            cliente: { type: 'string', description: 'Nombre, apellido, DNI o CUIT del cliente del expediente.' },
            numeroCausa: { type: 'string', description: 'Número de causa judicial o número interno EXP-año-id del expediente.' },
            expedienteId: { type: 'integer', description: 'Id del expediente, si ya lo conocés por otra herramienta.' },
            soloProcesales: {
                type: 'boolean',
                description: 'Solo las novedades marcadas como procesales. Si no trae nada, volvé a buscar sin este filtro.',
            },
            fechaDesde: { type: 'string', description: 'Fecha de la novedad mínima, formato YYYY-MM-DD.' },
            fechaHasta: { type: 'string', description: 'Fecha de la novedad máxima, formato YYYY-MM-DD.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25, por defecto 10).' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const criterios = elegir(input, CRITERIOS);
        const filtros = {
            ...criterios,
            soloProcesales: input.soloProcesales === true,
            usuarioId: usuarioIdDe(ctx),
            limite: input.limite,
        };

        const indicaOtroExpediente = criterios.expedienteId || criterios.numeroCausa || criterios.cliente;
        if (ctx.expedienteId && !indicaOtroExpediente) {
            filtros.expedienteId = ctx.expedienteId;
        }

        if (Object.keys(criterios).length === 0 && !filtros.expedienteId) return sinCriterios();

        const novedades = await busquedaService.buscarNovedades(filtros);

        return {
            resumen: novedades.map((n) => ({
                id: n.id,
                titulo: n.titulo,
                tipo: n.tipo,
                fecha: fechaIso(n.fecha),
                procesal: n.esProcesal,
                expediente: n.numeroExpediente,
                caratula: n.caratula,
                descripcion: recortar(n.descripcion, 300),
            })),
            items: novedades.map((n) => ({
                tipo: 'novedad',
                id: n.id,
                titulo: n.titulo,
                subtitulo: subtitulo(n.numeroExpediente, n.tipo, fechaCorta(n.fecha)),
                expedienteId: n.expedienteId,
                numeroExpediente: n.numeroExpediente,
            })),
        };
    },
};
