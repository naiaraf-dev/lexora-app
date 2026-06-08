const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');

router.get('/documento', documentosController.obtenerDocumentos);

router.get('/documentos', documentosController.obtenerTodosLosDocumentos);

router.post('/insertarDocumento', documentosController.insertarDocumento);

module.exports = router;