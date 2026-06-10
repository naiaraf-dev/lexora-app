const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');

const uploadDocumento = require('../middlewares/uploadDocumento');

router.get('/documento', documentosController.obtenerDocumentos);

router.get('/documentos', documentosController.obtenerTodosLosDocumentos);

router.post('/insertarDocumento', documentosController.insertarDocumento);

router.post('/subirDocumento', (req, res, next) => {
    uploadDocumento.single('archivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ mensaje: err.message });
        }
        next();
    });
}, documentosController.subirDocumento);

router.delete('/documento/:iddocumento', documentosController.eliminarDocumento);

router.put('/documento/:iddocumento',uploadDocumento.single('archivo'),documentosController.modificarDocumento);

module.exports = router;