const express = require('express');
const router = express.Router();

const controller = require('../controllers/asistenteDocumentos.controller');
const { autenticacionLitis, limiteEnlaces } = require('../asistente/seguridad');

// POST /api/asistente/documentos/:id/enlace → genera un enlace temporal (requiere sesion)
router.post('/:id/enlace', autenticacionLitis, limiteEnlaces, controller.pedirEnlace);

// GET /api/asistente/documentos/descargar?t=&modo= → entrega el archivo
// no usa autenticacion: se valida con el token del enlace
router.get('/descargar', controller.descargar);

module.exports = router;
