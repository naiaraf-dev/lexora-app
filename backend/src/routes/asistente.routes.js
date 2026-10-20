const express = require('express');
const router = express.Router();
const controller = require('../controllers/asistente.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// conversar con Litis (HU33)
router.post('/mensajes', authMiddleware, controller.enviarMensaje);

module.exports = router;
