const express = require('express');
const controller = require('../controllers/enums.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get(
    '/enums/tipoexpediente/:tipoExpedienteId/transiciones',
    controller.getTransicionesPorTipo
);
router.get('/enums/:enumName', authMiddleware, controller.getAll);
router.post('/enums/:enumName', authMiddleware, controller.create);
router.get(
    '/enums/tipoexpediente/:tipoExpedienteId/estados',
    controller.getEstadosPorTipoExpediente
);

module.exports = router;