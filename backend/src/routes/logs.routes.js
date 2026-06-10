const express = require('express');
const router = express.Router();
const controller = require('../controllers/logs.controller');

router.get('/', controller.listar);
router.get('/stats', controller.stats);
router.get('/usuarios', controller.usuarios);
router.get('/:id', controller.obtener);

module.exports = router;
