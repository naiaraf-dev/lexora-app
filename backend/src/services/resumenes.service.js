const path = require('path');
const llm = require('../config/llm');
const resumenesRepository = require('../repositories/resumenes.repository');
const cloudinaryDocumento = require('./cloudinaryDocumento.service');
const extraccionTexto = require('./extraccionTexto.service');
const { ESQUEMA_JSON_RESUMEN, resumenSchema, unirPalabrasClave } = require('../asistente/resumen.schema');

// genera el resumen de cada documento subido (HU42)

// formatos que la IA lee directamente
const FORMATOS_DIRECTOS = {
    pdf: { tipo: 'document', mediaType: 'application/pdf' },
    jpg: { tipo: 'image', mediaType: 'image/jpeg' },
    jpeg: { tipo: 'image', mediaType: 'image/jpeg' },
    png: { tipo: 'image', mediaType: 'image/png' },
    webp: { tipo: 'image', mediaType: 'image/webp' },
};

// tope de texto de un Word (~100.000 tokens); los escritos judiciales normales quedan muy por debajo
const MAX_CARACTERES_TEXTO = 400_000;

// un documento que quedo en 'procesando' mas de este tiempo se considera trabado
const MINUTOS_TRABADO = 15;

const INSTRUCCIONES = `Resumís documentos cargados en expedientes de Lexora, un sistema de gestión jurídica, para que después se puedan encontrar por su contenido.

- Usá solo información que esté en el documento. Si un dato no aparece, dejá el texto vacío o la lista vacía; no lo inventes.
- Escribí en español.
- Fechas en formato AAAA-MM-DD.
- En palabras_clave incluí sinónimos útiles para buscar (por ejemplo "despido" y "desvinculación").
- No incluyas DNI, CUIT, domicilios, teléfonos ni correos en ningún campo.`;

// error que significa "este documento no se puede resumir": se marca omitido y no se reintenta
class DocumentoNoResumible extends Error {}

function extensionDe(nombreArchivo) {
    return path.extname(nombreArchivo ?? '').slice(1).toLowerCase();
}

// topes de memoria del job: el archivo descargado (igual que el limite de subida) y lo que se
// descomprime de un .docx, que es un ZIP y podria inflarse a varios GB al extraer el texto
const MB = 1024 * 1024;
const MAX_BYTES_DESCOMPRIMIDO = 50 * MB;

function maximoBytesArchivo() {
    const mb = Number(process.env.RESUMEN_IA_MAX_MB);
    return (Number.isFinite(mb) && mb > 0 ? mb : 10) * MB;
}

function archivoDemasiadoGrande() {
    return new DocumentoNoResumible(`El archivo supera el límite de ${maximoBytesArchivo() / MB} MB para resumirlo`);
}

// descarga cortando apenas se pasa del tope, sin confiar en el tamaño que declara el servidor
async function descargar(storageKey) {
    const respuesta = await fetch(cloudinaryDocumento.obtenerUrlDocumentoCloudinary(storageKey));
    if (!respuesta.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${respuesta.status})`);

    const maximo = maximoBytesArchivo();
    if (Number(respuesta.headers.get('content-length')) > maximo) {
        await respuesta.body?.cancel();
        throw archivoDemasiadoGrande();
    }

    const partes = [];
    let total = 0;
    for await (const parte of respuesta.body) {
        total += parte.length;
        if (total > maximo) throw archivoDemasiadoGrande();
        partes.push(parte);
    }
    return Buffer.concat(partes);
}

// arma el contenido que se le manda a la IA segun el tipo de archivo
async function armarContenido(buffer, extension) {
    const pedido = { type: 'text', text: 'Resumí este documento.' };

    const formato = FORMATOS_DIRECTOS[extension];
    if (formato) {
        return [
            { type: formato.tipo, source: { type: 'base64', media_type: formato.mediaType, data: buffer.toString('base64') } },
            pedido,
        ];
    }

    if (extraccionTexto.esWord(extension)) {
        let texto;
        try {
            // el control de tamaño va por el contenido del archivo, no por su extension
            texto = await extraccionTexto.textoDeWord(buffer, MAX_BYTES_DESCOMPRIMIDO);
        } catch (error) {
            if (error instanceof extraccionTexto.ArchivoWordInvalido) throw new DocumentoNoResumible(error.message);
            throw error;
        }
        if (!texto) throw new DocumentoNoResumible('El documento Word no tiene texto');

        const recortado = texto.length > MAX_CARACTERES_TEXTO;
        const encabezado = recortado
            ? 'Texto del documento (es muy largo: se muestra solo el comienzo):'
            : 'Texto del documento:';

        return [{ type: 'text', text: `${encabezado}\n\n${texto.slice(0, MAX_CARACTERES_TEXTO)}` }, pedido];
    }

    throw new DocumentoNoResumible(`Tipo de archivo no soportado: .${extension || 'sin extensión'}`);
}

// pide el resumen a la IA con salida estructurada y lo valida
async function generarResumen(contenido) {
    const respuesta = await llm.enviar({
        system: [{ type: 'text', text: INSTRUCCIONES }],
        messages: [{ role: 'user', content: contenido }],
        outputConfig: { format: { type: 'json_schema', schema: ESQUEMA_JSON_RESUMEN } },
    });

    if (respuesta.stop_reason === 'refusal') throw new Error('La IA rechazó resumir el documento');
    if (respuesta.stop_reason === 'max_tokens') throw new Error('La respuesta de la IA quedó incompleta');

    const texto = respuesta.content
        .filter((bloque) => bloque.type === 'text')
        .map((bloque) => bloque.text)
        .join('');

    let json;
    try {
        json = JSON.parse(texto);
    } catch {
        throw new Error('La IA no devolvió un JSON válido');
    }

    const valido = resumenSchema.safeParse(json);
    if (!valido.success) throw new Error('El resumen no tiene el formato esperado');

    return { datos: valido.data, modelo: respuesta.model ?? llm.configuracion().modelo };
}

/**
 * Resume un documento y guarda el resultado.
 * @returns {Promise<'procesado'|'error'|'omitido'|'pospuesto'>}
 */
async function procesarDocumento(documentoId) {
    const documento = await resumenesRepository.obtenerDocumento(documentoId);

    if (!documento || !documento.activo || !documento.storageKey) {
        await resumenesRepository.marcarOmitido(documentoId, 'El documento no tiene un archivo disponible');
        return 'omitido';
    }

    try {
        const extension = extensionDe(documento.nombreArchivo);
        if (!FORMATOS_DIRECTOS[extension] && !extraccionTexto.esWord(extension)) {
            throw new DocumentoNoResumible(`Tipo de archivo no soportado: .${extension || 'sin extensión'}`);
        }

        const buffer = await descargar(documento.storageKey);
        const contenido = await armarContenido(buffer, extension);
        const { datos, modelo } = await generarResumen(contenido);

        await resumenesRepository.guardarResumen(documentoId, {
            tipoDetectado: datos.tipo_detectado,
            resumen: datos.resumen,
            palabrasClave: unirPalabrasClave(datos.palabras_clave),
            datosJson: JSON.stringify({
                partes: datos.partes,
                fechas: datos.fechas,
                montos: datos.montos,
                temas: datos.temas,
            }),
            modelo,
        });
        return 'procesado';
    } catch (error) {
        if (error instanceof DocumentoNoResumible) {
            await resumenesRepository.marcarOmitido(documentoId, error.message);
            return 'omitido';
        }

        // el proveedor de IA no esta disponible: no es culpa del documento, no se cuenta el intento
        if (error.codigo === 'ASISTENTE_NO_DISPONIBLE') {
            await resumenesRepository.devolverAPendiente(documentoId);
            return 'pospuesto';
        }

        console.error(`[resumenes] fallo el documento ${documentoId}:`, error.message);
        await resumenesRepository.registrarError(documentoId, error.message);
        return 'error';
    }
}

/**
 * Procesa un lote de documentos pendientes, de a uno para no superar los limites del proveedor.
 * @param {Object} opciones
 * @param {number} opciones.lote        - cantidad maxima de documentos por ejecucion
 * @param {number} opciones.maxIntentos - intentos antes de dejar un documento en 'error'
 */
async function procesarLote({ lote, maxIntentos }) {
    const resultado = { procesado: 0, error: 0, omitido: 0, pospuesto: 0 };

    // sin clave de IA no se toma nada de la cola: los documentos esperan sin gastar intentos
    if (!llm.estaDisponible()) return resultado;

    await resumenesRepository.liberarTrabados(MINUTOS_TRABADO);
    const ids = await resumenesRepository.tomarLote(lote, maxIntentos);

    for (const [indice, documentoId] of ids.entries()) {
        const estado = await procesarDocumento(documentoId);
        resultado[estado]++;

        // si el proveedor no responde, el resto del lote vuelve a la cola para la proxima ejecucion
        if (estado === 'pospuesto') {
            const restantes = ids.slice(indice + 1);
            await Promise.all(restantes.map((id) => resumenesRepository.devolverAPendiente(id)));
            resultado.pospuesto += restantes.length;
            break;
        }
    }

    return resultado;
}

// encola un documento recien subido o con archivo reemplazado.
// nunca hace fallar la subida: si no se puede encolar, se registra y la HU43 lo puede recuperar
async function encolar(documentoId) {
    try {
        await resumenesRepository.marcarPendiente(documentoId);
    } catch (error) {
        console.error(`[resumenes] no se pudo encolar el documento ${documentoId}:`, error.message);
    }
}

module.exports = {
    encolar,
    procesarLote,
    procesarDocumento,
    // se exportan para tests
    armarContenido,
    generarResumen,
    DocumentoNoResumible,
    INSTRUCCIONES,
};
