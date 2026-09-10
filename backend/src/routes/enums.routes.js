const express = require('express');
const controller = require('../controllers/enums.controller');

const router = express.Router();

// guard de autenticación: va POR RUTA porque este router se monta en el prefijo
// ancho '/api', compartido con rutas públicas como /api/auth.
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/enums/:enumName', authMiddleware, controller.getAll);
router.post('/enums/:enumName', authMiddleware, controller.create);

module.exports = router;