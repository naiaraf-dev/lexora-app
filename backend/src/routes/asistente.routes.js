const express = require('express');
const router = express.Router();
const controller = require('../controllers/asistente.controller');
const { autenticacionLitis, limiteMensajes } = require('../asistente/seguridad');

// conversar con Litis (HU33), con sesion y limite de consultas por usuario (HU40)
router.post('/mensajes', autenticacionLitis, limiteMensajes, controller.enviarMensaje);

module.exports = router;
