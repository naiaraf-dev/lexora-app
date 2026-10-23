const busquedaService = require('../../services/busqueda.service');
const { elegir, fechaIso, fechaCorta, subtitulo, sinCriterios, recortar, usuarioIdDe } = require('./comun');

const CRITERIOS = ['texto', 'cliente', 'numeroCausa', 'expedienteId', 'fechaDesde', 'fechaHasta'];
const ESTADOS = ['pendientes', 'vencidas', 'cumplidas', 'todas'];

// tareas de los expedientes para Litis (HU36)
module.exports = {
    name: 'listar_tareas',
    description:
        'Lista las tareas de los expedientes: pendientes, vencidas o cumplidas, con su fecha de vencimiento y ' +
        'prioridad. Usala cuando el usuario pregunte qué hay que hacer, qué vence o qué está atrasado, en un ' +
        'expediente o en general (por ejemplo "¿qué expedientes tienen tareas vencidas?"). Las vencidas son las ' +
        'marcadas como vencidas y las pendientes cuya fecha ya pasó. Vienen ordenadas por vencimiento, la más ' +
        'próxima primero (las cumplidas, la más reciente primero). Si se está trabajando sobre un expediente y el usuario no indica otro expediente ni ' +
        'otro cliente, se listan las de ese expediente.',
    input_schema: {
        type: 'object',
        properties: {
            estado: {
                type: 'string',
                enum: ESTADOS,
                description: 'Qué tareas traer. "pendientes" incluye las vencidas. Por defecto "pendientes".',
            },
            texto: { type: 'string', description: 'Palabras del título o la descripción de la tarea.' },
            cliente: { type: 'string', description: 'Nombre, apellido, DNI o CUIT del cliente del expediente.' },
            numeroCausa: { type: 'string', description: 'Número de causa judicial o número interno EXP-año-id del expediente.' },
            expedienteId: { type: 'integer', description: 'Id del expediente, si ya lo conocés por otra herramienta.' },
            fechaDesde: { type: 'string', description: 'Vencimiento mínimo, formato YYYY-MM-DD.' },
            fechaHasta: { type: 'string', description: 'Vencimiento máximo, formato YYYY-MM-DD.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25, por defecto 10).' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const criterios = elegir(input, CRITERIOS);
        const estado = ESTADOS.includes(input.estado) ? input.estado : 'pendientes';
        const filtros = { ...criterios, estadoTarea: estado, usuarioId: usuarioIdDe(ctx), limite: input.limite };

        // en modo expediente (HU37) se listan las del expediente abierto,
        // salvo que el usuario haya pedido otro expediente u otro cliente
        const indicaOtroExpediente = criterios.expedienteId || criterios.numeroCausa || criterios.cliente;
        if (ctx.expedienteId && !indicaOtroExpediente) {
            filtros.expedienteId = ctx.expedienteId;
        }

        // fuera de un expediente alcanza con pedir un estado valido ("¿qué tareas vencidas hay?"), pero no "todas"
        const pidioEstado = ESTADOS.includes(input.estado) && input.estado !== 'todas';
        const sinFiltro = Object.keys(criterios).length === 0 && !filtros.expedienteId;
        if (sinFiltro && !pidioEstado) return sinCriterios();

        const tareas = await busquedaService.buscarTareas(filtros);

        return {
            resumen: tareas.map((t) => ({
                id: t.id,
                titulo: t.titulo,
                estado: t.estado,
                prioridad: t.prioridad,
                vence: fechaIso(t.fechaVencimiento),
                hora: t.hora || undefined,
                expediente: t.numeroExpediente,
                caratula: t.caratula,
                descripcion: recortar(t.descripcion, 200),
            })),
            items: tareas.map((t) => ({
                tipo: 'tarea',
                id: t.id,
                titulo: t.titulo,
                subtitulo: subtitulo(
                    t.numeroExpediente,
                    t.estado,
                    t.fechaVencimiento ? `vence ${fechaCorta(t.fechaVencimiento)}` : undefined,
                ),
                expedienteId: t.expedienteId,
                numeroExpediente: t.numeroExpediente,
            })),
        };
    },
};
