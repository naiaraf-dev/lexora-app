const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/usuarios.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', controller.getPerfil);
router.put('/profile', controller.actualizarPerfil);
router.put('/profile/image', upload.single('imagen'), controller.actualizarImagen);
router.put('/change-password', controller.cambiarPassword);
router.delete('/profile', controller.eliminarCuenta);
router.get('/', controller.getAll);

module.exports = router;
