const path = require('path');
const cloudinary = require('../config/cloudinary');

function limpiarNombreArchivo(nombre) {
    return nombre
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]/g, '');
}

function subirDocumentoACloudinary(file, carpeta = 'lexora/documentos') {
    return new Promise((resolve, reject) => {
        const nombreOriginal = file.originalname
            ? Buffer.from(file.originalname, 'latin1').toString('utf8')
            : `archivo_${Date.now()}`;

        const extension = path.extname(nombreOriginal) || '';
        const nombreBase = extension
            ? path.basename(nombreOriginal, extension)
            : nombreOriginal;

        const nombreLimpio = limpiarNombreArchivo(nombreBase);
        const publicId = `${Date.now()}_${nombreLimpio}${extension}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: carpeta,
                public_id: publicId,
                resource_type: 'raw'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(file.buffer);
    });
}

async function eliminarDocumentoDeCloudinary(storageKey) {
    if (!storageKey) {
        return {
            result: 'sin_storage_key'
        };
    }

    const resultado = await cloudinary.uploader.destroy(storageKey, {
        resource_type: 'raw'
    });

    return resultado;
}

function obtenerUrlDocumentoCloudinary(storageKey) {
    return cloudinary.url(storageKey, {
        resource_type: 'raw',
        type: 'upload',
        secure: true,
        sign_url: true
    });
}

module.exports = {
    subirDocumentoACloudinary,
    eliminarDocumentoDeCloudinary,
    obtenerUrlDocumentoCloudinary
};