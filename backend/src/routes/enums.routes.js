const express = require('express');
const controller = require('../controllers/enums.controller');

const router = express.Router();

router.get('/enums/:enumName', controller.getAll);
router.post('/enums/:enumName', controller.create);

module.exports = router;