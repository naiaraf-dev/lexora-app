const express =
    require('express');

const router =
    express.Router();

const tasasController =
    require('../controllers/tasas.controller');


router.get(
    '/',
    tasasController.obtenerTasa
);


module.exports =
    router;