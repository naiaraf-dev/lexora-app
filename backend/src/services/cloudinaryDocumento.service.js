const path = require('path');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../config/s3');
const BUCKET = process.env.S3_BUCKET;

// limpia el nombre del archivo para que no tenga espacios ni caracteres raros
function limpiarNombreArchivo(nombre) {
    return nombre
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]/g, '');
}

// sube el archivo a cloudinary y devuelve el resultado de la subida
function subirDocumentoACloudinary(file, carpeta = 'lexora/documentos') {
    return new Promise((resolve, reject) => {
        // intenta respetar el nombre original del archivo
        const nombreOriginal = file.originalname
            ? Buffer.from(file.originalname, 'latin1').toString('utf8')
            : `archivo_${Date.now()}`;

        const extension = path.extname(nombreOriginal) || '';
        const nombreBase = extension
            ? path.basename(nombreOriginal, extension)
            : nombreOriginal;

        const nombreLimpio = limpiarNombreArchivo(nombreBase);

        // arma un public id unico usando la fecha actual
        const publicId = `${Date.now()}_${nombreLimpio}${extension}`;

        const key = `${carpeta}/${publicId}`;
        s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype }))
            .then(() => resolve({ public_id: key, secure_url: null, resource_type: 'raw', format: extension.slice(1) }))
            .catch(reject);
    });
}

// elimina un documento de cloudinary usando su storage key
async function eliminarDocumentoDeCloudinary(storageKey) {
    if (!storageKey) {
        return {
            result: 'sin_storage_key'
        };
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    return { result: 'ok' };
}

// genera la url segura para acceder o descargar el documento
async function obtenerUrlDocumentoCloudinary(storageKey) {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }), { expiresIn: 300 });
}

module.exports = {
    subirDocumentoACloudinary,
    eliminarDocumentoDeCloudinary,
    obtenerUrlDocumentoCloudinary
};