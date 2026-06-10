const path = require('path');
const cloudinary = require('../config/cloudinary');

function limpiarNombreArchivo(nombre) {
    return nombre
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]/g, '');
}

function subirDocumentoACloudinary(file, carpeta = 'lexora/documentos') {
    return new Promise((resolve, reject) => {
        const extension = path.extname(file.originalname); // .pdf, .docx, .png
        const nombreBase = path.basename(file.originalname, extension);

        const nombreLimpio = limpiarNombreArchivo(nombreBase);

        const publicId = `${Date.now()}_${nombreLimpio}${extension}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: carpeta,
                public_id: publicId,
                resource_type: 'raw'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

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

module.exports = {
    subirDocumentoACloudinary,
    eliminarDocumentoDeCloudinary
};