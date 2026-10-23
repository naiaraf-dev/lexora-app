const path = require('path');
const asistenteRepository = require('../../repositories/asistente.repository');
const busquedaService = require('../../services/busqueda.service');
const cloudinaryDocumento = require('../../services/cloudinaryDocumento.service');
const { errorLitis } = require('../errores');
const { usuarioIdDe } = require('./comun');

const MB = 1024 * 1024;
const MAX_MB_POR_DEFECTO = 5;

// formatos que la IA puede leer directamente
const FORMATOS = {
    pdf: { tipo: 'document', mediaType: 'application/pdf' },
    jpg: { tipo: 'image', mediaType: 'image/jpeg' },
    jpeg: { tipo: 'image', mediaType: 'image/jpeg' },
    png: { tipo: 'image', mediaType: 'image/png' },
    webp: { tipo: 'image', mediaType: 'image/webp' },
};

function maximoBytes() {
    const mb = Number(process.env.LITIS_LECTURA_MAX_MB);
    return (Number.isFinite(mb) && mb > 0 ? mb : MAX_MB_POR_DEFECTO) * MB;
}

function extensionDe(nombreArchivo) {
    return path.extname(nombreArchivo ?? '').slice(1).toLowerCase();
}

// si la IA no conoce el id, busca el documento dentro del expediente abierto
async function resolverDocumento(input, ctx) {
    const documentoId = Number(input.documentoId);
    if (Number.isInteger(documentoId) && documentoId > 0) return { documentoId };

    const candidatos = await busquedaService.buscarDocumentos({
        expedienteId: ctx.expedienteId,
        usuarioId: usuarioIdDe(ctx),
        tipoDocumento: input.tipoDocumento,
        texto: input.texto,
        limite: 5,
    });

    if (candidatos.length === 0) {
        throw errorLitis(404, 'NO_ENCONTRADO', 'No encontré ese documento en este expediente.');
    }
    if (candidatos.length > 1) return { candidatos };
    return { documentoId: candidatos[0].id };
}

async function descargar(storageKey) {
    const respuesta = await fetch(cloudinaryDocumento.obtenerUrlDocumentoCloudinary(storageKey));
    if (!respuesta.ok) throw errorLitis(404, 'NO_ENCONTRADO', 'El archivo no está disponible.');

    const declarado = Number(respuesta.headers.get('content-length'));
    if (declarado > maximoBytes()) return null;

    const contenido = Buffer.from(await respuesta.arrayBuffer());
    return contenido.length > maximoBytes() ? null : contenido;
}

// lectura de un documento bajo demanda (HU45). El contenido solo viaja a la IA
// dentro de este pedido: no se guarda ni se devuelve al front.
module.exports = {
    name: 'leer_documento',
    soloModoExpediente: true,
    description:
        'Abre y lee un documento del expediente abierto para responder una pregunta puntual sobre su contenido ' +
        '(por ejemplo, el monto que reclama una demanda). Pasá documentoId si lo conocés; si no, tipoDocumento ' +
        'o texto del nombre para buscarlo en el expediente. Si hay varios candidatos, preguntale al usuario cuál.',
    input_schema: {
        type: 'object',
        properties: {
            documentoId: { type: 'integer', description: 'Id del documento.' },
            tipoDocumento: { type: 'string', description: 'Tipo de documento, por ejemplo "Demanda".' },
            texto: { type: 'string', description: 'Parte del nombre o la descripción del documento.' },
        },
        additionalProperties: false,
    },

    async ejecutar(input = {}, ctx = {}) {
        if (!ctx.expedienteId) {
            throw errorLitis(400, 'PEDIDO_INVALIDO', 'Solo puedo leer documentos desde un expediente.');
        }

        const { documentoId, candidatos } = await resolverDocumento(input, ctx);
        if (candidatos) {
            return {
                resumen: {
                    aviso: 'Hay varios documentos posibles. Preguntale al usuario cuál quiere que lea.',
                    candidatos: candidatos.map((d) => ({ id: d.id, nombre: d.nombreArchivo, tipo: d.tipoDocumento, fecha: d.fecha })),
                },
                items: [],
            };
        }

        const documento = await asistenteRepository.obtenerDocumentoParaLectura(documentoId);

        // solo documentos activos del expediente abierto
        if (!documento || !documento.activo || documento.expedienteId !== ctx.expedienteId) {
            throw errorLitis(404, 'NO_ENCONTRADO', 'No encontré ese documento en este expediente.');
        }
        const extension = extensionDe(documento.nombreArchivo);
        const formato = FORMATOS[extension];
        if (!formato) {
            return { resumen: { aviso: `Todavía no puedo leer archivos .${extension || 'sin extensión'}. Solo PDF e imágenes.` }, items: [] };
        }
        if (!documento.storageKey) {
            throw errorLitis(404, 'NO_ENCONTRADO', 'El archivo no está disponible.');
        }

        const contenido = await descargar(documento.storageKey);
        if (!contenido) {
            const limite = maximoBytes() / MB;
            return { resumen: { aviso: `El documento supera el límite de ${limite} MB para leerlo con IA.` }, items: [] };
        }

        return {
            resumen: { id: documento.id, nombre: documento.nombreArchivo, tipo: documento.tipoDocumento },
            items: [{
                tipo: 'documento',
                id: documento.id,
                titulo: documento.nombreArchivo,
                subtitulo: [ctx.numeroExpediente, documento.tipoDocumento].filter(Boolean).join(' · '),
                expedienteId: documento.expedienteId,
                numeroExpediente: ctx.numeroExpediente,
                extension,
            }],
            // va solo a la IA, dentro del resultado de la herramienta
            contenido: [{
                type: formato.tipo,
                source: { type: 'base64', media_type: formato.mediaType, data: contenido.toString('base64') },
            }],
        };
    },
};
