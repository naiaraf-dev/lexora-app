const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const documentosService = require('./documentos.service');
const { errorLitis } = require('../asistente/errores');

const VALIDEZ_SEGUNDOS = 60;
const AUDIENCIA = 'litis-descarga';
const MODOS = ['ver', 'descargar'];

// cloudinary guarda los archivos como raw: el tipo se deduce de la extension
const TIPOS_CONTENIDO = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// clave propia de los enlaces, derivada de JWT_SECRET:
// asi un enlace no sirve como token de sesion ni al reves
function claveEnlaces() {
    return crypto.createHmac('sha256', process.env.JWT_SECRET).update(AUDIENCIA).digest();
}

function validarModo(modo = 'descargar') {
    if (!MODOS.includes(modo)) {
        throw errorLitis(400, 'PEDIDO_INVALIDO', 'El modo debe ser "ver" o "descargar".');
    }
    return modo;
}

function validarIdDocumento(idDocumento) {
    const documentoId = Number(idDocumento);
    if (!Number.isInteger(documentoId) || documentoId <= 0) {
        throw errorLitis(400, 'PEDIDO_INVALIDO', 'El id del documento no es válido.');
    }
    return documentoId;
}

function generarToken(documentoId, usuarioId) {
    return jwt.sign(
        { doc: documentoId, usr: usuarioId },
        claveEnlaces(),
        { audience: AUDIENCIA, expiresIn: VALIDEZ_SEGUNDOS }
    );
}

function verificarToken(token) {
    try {
        const datos = jwt.verify(token, claveEnlaces(), { audience: AUDIENCIA });
        return { documentoId: datos.doc, usuarioId: datos.usr };
    } catch {
        throw errorLitis(401, 'ENLACE_INVALIDO', 'El enlace venció. Volvé a abrir el documento.');
    }
}

// devuelve el documento y su url de cloudinary, o NO_ENCONTRADO si no existe o esta dado de baja
async function buscarDocumentoDescargable(documentoId) {
    let resultado;

    try {
        resultado = await documentosService.obtenerUrlDescargaDocumento(documentoId);
    } catch (error) {
        if (error.statusCode === 404) {
            throw errorLitis(404, 'NO_ENCONTRADO', 'No encontré el documento.');
        }
        throw error;
    }

    if (!resultado.documento.activo) {
        throw errorLitis(404, 'NO_ENCONTRADO', 'No encontré el documento.');
    }

    return resultado;
}

async function crearEnlace(idDocumento, usuario, modo) {
    const documentoId = validarIdDocumento(idDocumento);
    const modoValido = validarModo(modo);

    await buscarDocumentoDescargable(documentoId);

    const token = generarToken(documentoId, usuario.id);

    return {
        url: `/api/asistente/documentos/descargar?t=${encodeURIComponent(token)}&modo=${modoValido}`,
        expiraEn: VALIDEZ_SEGUNDOS,
    };
}

async function obtenerArchivo(token, modo) {
    const modoValido = validarModo(modo);
    const { documentoId, usuarioId } = verificarToken(token);
    const { documento, url } = await buscarDocumentoDescargable(documentoId);

    const respuesta = await fetch(url);
    if (!respuesta.ok) {
        throw errorLitis(404, 'NO_ENCONTRADO', 'El archivo no está disponible.');
    }

    const extension = path.extname(documento.nombre_archivo ?? '').slice(1).toLowerCase();

    return {
        contenido: Buffer.from(await respuesta.arrayBuffer()),
        tipoContenido: TIPOS_CONTENIDO[extension] ?? 'application/octet-stream',
        nombreArchivo: documento.nombre_archivo || 'documento',
        disposicion: modoValido === 'ver' ? 'inline' : 'attachment',
        // para la auditoria de la HU40
        documentoId,
        usuarioId,
    };
}

module.exports = {
    crearEnlace,
    obtenerArchivo,
    // se exportan para tests
    generarToken,
    verificarToken,
    VALIDEZ_SEGUNDOS,
};
