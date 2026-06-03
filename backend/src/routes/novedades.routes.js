const express = require('express');
const router = express.Router();
const controller = require('./novedades_controller');

// GET  /api/novedades/:id        → obtener una
router.get('/:id',  controller.obtener);

// POST /api/novedades            → crear
router.post('/',    controller.crear);

// PUT  /api/novedades/:id        → editar
router.put('/:id',  controller.actualizar);

// DELETE /api/novedades/:id      → baja lógica
router.delete('/:id', controller.eliminar);

module.exports = router;