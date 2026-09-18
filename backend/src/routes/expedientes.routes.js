const express = require('express');
const router = express.Router();
const controller = require('../controllers/expedientes.controller');
const novedadesController = require('../controllers/novedades.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// protege todas las rutas de este router: exige token JWT válido
router.use(authMiddleware);

// GET  /api/expedientes          → listar con filtros y paginación
router.get('/',     controller.listar);

// GET  /api/expedientes/:id/novedades → listar novedades del expediente
router.get('/:id/novedades', novedadesController.listarPorExpediente);

// GET  /api/expedientes/:id      → obtener uno completo
router.get('/:id',  controller.obtener);

// POST /api/expedientes          → crear
router.post('/',    controller.crear);

// PUT  /api/expedientes/:id      → editar (también sirve para cerrar)
router.put('/:id',  controller.actualizar);

// DELETE /api/expedientes/:id    → baja lógica
router.delete('/:id', controller.eliminar);

module.exports = router;