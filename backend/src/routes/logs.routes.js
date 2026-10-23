const express = require('express');
const router = express.Router();
const controller = require('../controllers/logs.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// protege todas las rutas de este router: exige token JWT válido
router.use(authMiddleware);

router.get('/', controller.listar);
router.get('/stats', controller.stats);
router.get('/usuarios', controller.usuarios);
router.get('/:id', controller.obtener);

module.exports = router;
