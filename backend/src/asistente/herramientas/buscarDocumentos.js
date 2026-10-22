const busquedaService = require('../../services/busqueda.service');
const { elegir, fechaIso, fechaCorta, subtitulo, sinCriterios, recortar, usuarioIdDe } = require('./comun');

const CRITERIOS = ['texto', 'cliente', 'tipoDocumento', 'numeroCausa', 'expedienteId', 'fechaDesde', 'fechaHasta'];

// largo del resumen que se le pasa a la IA por cada documento: alcanza para explicar por que lo eligio
const LARGO_RESUMEN_PARA_IA = 300;

// busqueda de documentos para Litis (HU35), tambien por su contenido (HU44)
module.exports = {
    name: 'buscar_documentos',
    description:
        'Busca documentos (PDF, Word o imágenes) cargados en los expedientes, por nombre o descripción del ' +
        'archivo, por lo que dice el documento (su resumen, temas y partes), tipo de documento, cliente, ' +
        'expediente o fecha. Usala cuando el usuario pida un archivo (una demanda, un contrato, un escrito, ' +
        'una cédula) o un documento sobre un tema, por ejemplo "el escrito donde reclaman horas extra". ' +
        'Los documentos encontrados se le muestran al usuario como tarjetas para abrirlos o descargarlos. ' +
        'Si se está trabajando sobre un expediente y el usuario no indica otro expediente ni otro cliente, ' +
        'la búsqueda se limita a ese expediente.',
    input_schema: {
        type: 'object',
        properties: {
            texto: {
                type: 'string',
                description:
                    'Pocas palabras clave del tema o del nombre del archivo, por ejemplo "horas extra" o "pericia contable". ' +
                    'Cada palabra tiene que aparecer en el documento, así que no pongas frases largas.',
            },
            cliente: { type: 'string', description: 'Nombre, apellido, DNI o CUIT del cliente del expediente.' },
            tipoDocumento: { type: 'string', description: 'Tipo de documento, por ejemplo "Demanda", "Contestación", "Sentencia".' },
            numeroCausa: { type: 'string', description: 'Número de causa judicial o número interno EXP-año-id del expediente.' },
            expedienteId: { type: 'integer', description: 'Id del expediente, si ya lo conocés por otra herramienta.' },
            fechaDesde: { type: 'string', description: 'Fecha del documento mínima, formato YYYY-MM-DD.' },
            fechaHasta: { type: 'string', description: 'Fecha del documento máxima, formato YYYY-MM-DD.' },
            limite: { type: 'integer', description: 'Cantidad máxima de resultados (1 a 25, por defecto 10).' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        const criterios = elegir(input, CRITERIOS);
        const filtros = { ...criterios, usuarioId: usuarioIdDe(ctx), limite: input.limite };

        // en modo expediente (HU37) se busca en el expediente abierto,
        // salvo que el usuario haya pedido otro expediente u otro cliente
        const indicaOtroExpediente = criterios.expedienteId || criterios.numeroCausa || criterios.cliente;
        if (ctx.expedienteId && !indicaOtroExpediente) {
            filtros.expedienteId = ctx.expedienteId;
        }

        if (Object.keys(criterios).length === 0 && !filtros.expedienteId) return sinCriterios();

        const documentos = await busquedaService.buscarDocumentos(filtros);

        return {
            // a la IA le llegan datos minimos y el comienzo del resumen (HU44), nunca el archivo
            resumen: documentos.map((d) => ({
                id: d.id,
                nombre: d.nombreArchivo,
                tipo: d.tipoDocumento,
                fecha: fechaIso(d.fecha),
                expediente: d.numeroExpediente,
                caratula: d.caratula,
                contenido: recortar(d.resumen, LARGO_RESUMEN_PARA_IA),
            })),
            items: documentos.map((d) => ({
                tipo: 'documento',
                id: d.id,
                titulo: d.nombreArchivo,
                subtitulo: subtitulo(d.numeroExpediente, d.tipoDocumento, fechaCorta(d.fecha)),
                expedienteId: d.expedienteId,
                numeroExpediente: d.numeroExpediente,
                extension: d.extension ?? undefined,
            })),
        };
    },
};
