const express = require('express');
const router = express.Router();
const controller = require('../controllers/novedades.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// protege todas las rutas de este router: exige token JWT válido
router.use(authMiddleware);

// GET  /api/novedades/:id        → obtener una
router.get('/:id',  controller.obtener);

// POST /api/novedades            → crear
router.post('/',    controller.crear);

// PUT  /api/novedades/:id        → editar
router.put('/:id',  controller.actualizar);

// DELETE /api/novedades/:id      → baja lógica
router.delete('/:id', controller.eliminar);

module.exports = router;