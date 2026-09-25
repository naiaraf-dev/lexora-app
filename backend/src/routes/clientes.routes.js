const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');

// guard de autenticación: va POR RUTA porque este router se monta SIN prefijo
// (app.use(clientesRoutes)), así que un router.use se dispararía para TODA request.
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/api/clientes', authMiddleware, controller.getAll);
router.get('/api/clientes/:id', authMiddleware, controller.getById);
router.post('/api/clientes', authMiddleware, controller.create);
router.put('/api/clientes/:id', authMiddleware, controller.update);

module.exports = router;
