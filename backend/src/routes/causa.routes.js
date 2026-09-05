const express = require('express');
const router = express.Router();
const controller = require('../controllers/causa.controller');

// GET  /api/causas          → listar todas con filtros
router.get('/',     controller.listar);

// GET  /api/causas/:id      → obtener una con sus expedientes
router.get('/:id',  controller.obtener);

// DELETE /api/causas/:id    → baja logica
router.delete('/:id', controller.eliminar);

module.exports = router;