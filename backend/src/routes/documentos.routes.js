const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');

const uploadDocumento = require('../middlewares/uploadDocumento');

router.get('/documento', documentosController.obtenerDocumentos);

router.get('/documentos', documentosController.obtenerTodosLosDocumentos);

router.post('/insertarDocumento', documentosController.insertarDocumento);

router.post('/subirDocumento',uploadDocumento.single('archivo'),documentosController.subirDocumento);

module.exports = router;