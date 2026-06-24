const path = require('path');
const cloudinary = require('../config/cloudinary');

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

        // manda el buffer del archivo al stream de cloudinary
        uploadStream.end(file.buffer);
    });
}

// elimina un documento de cloudinary usando su storage key
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

// genera la url segura para acceder o descargar el documento
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