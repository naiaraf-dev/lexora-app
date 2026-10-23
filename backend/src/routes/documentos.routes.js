const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');

const uploadDocumento = require('../middlewares/uploadDocumento');

// guard de autenticación: va POR RUTA porque este router se monta en el prefijo
// ancho '/api', compartido con rutas públicas como /api/auth. Un router.use aquí
// interceptaría también esas rutas hermanas.
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/documento', authMiddleware, documentosController.obtenerDocumentos);

router.get('/documentos', authMiddleware, documentosController.obtenerTodosLosDocumentos);

router.post('/insertarDocumento', authMiddleware, documentosController.insertarDocumento);

router.post('/subirDocumento', authMiddleware, (req, res, next) => {
    uploadDocumento.single('archivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ mensaje: err.message });
        }
        next();
    });
}, documentosController.subirDocumento);

router.get('/documento/:iddocumento/descargar', authMiddleware, documentosController.descargarDocumento);

router.delete('/documento/:iddocumento', authMiddleware, documentosController.eliminarDocumento);

router.put('/documento/:iddocumento', authMiddleware, uploadDocumento.single('archivo'), documentosController.modificarDocumento);

module.exports = router;