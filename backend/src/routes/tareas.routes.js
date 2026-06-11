const express = require('express');
const router = express.Router();

const tareasController = require('../controllers/tareas.controller');

router.get('/tarea', tareasController.obtenerTareas);

router.get('/tareas', tareasController.obtenerTodasLasTareas);

router.post('/insertarTarea', tareasController.insertarTarea);

router.put('/tarea/:idtarea', tareasController.modificarTarea);

router.delete('/tarea/:idtarea', tareasController.eliminarTarea);

module.exports = router;