const express = require('express');
const router = express.Router();
const controller = require('./expedientes_controller');

// GET  /api/expedientes          → listar con filtros y paginación
router.get('/',     controller.listar);

// GET  /api/expedientes/:id      → obtener uno completo
router.get('/:id',  controller.obtener);

// POST /api/expedientes          → crear
router.post('/',    controller.crear);

// PUT  /api/expedientes/:id      → editar (también sirve para cerrar)
router.put('/:id',  controller.actualizar);

// DELETE /api/expedientes/:id    → baja lógica
router.delete('/:id', controller.eliminar);

module.exports = router;