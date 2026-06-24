const multer = require('multer');

// guarda el archivo en memoria, no en una carpeta del servidor
const storage = multer.memoryStorage();

const uploadDocumento = multer({
    storage,
    limits: {
        // limite maximo del archivo: 10 mb
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        // tipos de archivo permitidos para subir documentos
        const tiposPermitidos = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        // si el tipo de archivo no esta permitido, corta la subida
        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Tipo de archivo no permitido. Solo PDF, imágenes, DOC o DOCX.'));
        }

        // si esta permitido, deja pasar el archivo
        cb(null, true);
    }
});

module.exports = uploadDocumento;