const express = require('express');
const router = express.Router();

const tareasController = require('../controllers/tareas.controller');

// guard de autenticación: va POR RUTA porque este router se monta en el prefijo
// ancho '/api', compartido con rutas públicas como /api/auth.
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/tarea', authMiddleware, tareasController.obtenerTareas);

router.get('/tareas', authMiddleware, tareasController.obtenerTodasLasTareas);

router.post('/insertarTarea', authMiddleware, tareasController.insertarTarea);

router.put('/tarea/:idtarea', authMiddleware, tareasController.modificarTarea);

router.delete('/tarea/:idtarea', authMiddleware, tareasController.eliminarTarea);

module.exports = router;