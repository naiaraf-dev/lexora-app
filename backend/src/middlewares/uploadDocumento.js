const multer = require('multer');

const storage = multer.memoryStorage();

const uploadDocumento = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error('Tipo de archivo no permitido. Solo PDF, imágenes, DOC o DOCX.'));
        }

        cb(null, true);
    }
});

module.exports = uploadDocumento;