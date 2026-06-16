const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');

router.get('/api/clientes', controller.getAll);
router.get('/api/clientes/:id', controller.getById);
router.post('/api/clientes', controller.create);
router.put('/api/clientes/:id', controller.update);

module.exports = router;
