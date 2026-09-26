const express = require('express');

const router = express.Router();

const controller = require('../controllers/tareasAutomaticas.controller');

router.get(
    '/tareasAutomaticas/:tipoExpedienteId/:estadoExpedienteId',
    controller.obtenerPorTipoYEstado
);

module.exports = router;