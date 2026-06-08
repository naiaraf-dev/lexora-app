const cloudinary = require('../config/cloudinary');

function subirDocumentoACloudinary(file, carpeta = 'lexora/documentos') {
    return new Promise((resolve, reject) => {
        const nombreSinExtension = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]/g, '');

        const publicId = `${Date.now()}_${nombreSinExtension}`;

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

module.exports = {
    subirDocumentoACloudinary
};