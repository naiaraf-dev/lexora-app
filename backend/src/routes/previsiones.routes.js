const router = require('express').Router();
const controller = require('../controllers/previsiones.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadDocumento = require('../middlewares/uploadDocumento');

// Acciones con archivo (multipart, campo "archivo"): mismo middleware que /subirDocumento.
// Si el archivo no es válido responde 400 con el mensaje de multer.
const archivo = (req, res, next) => uploadDocumento.single('archivo')(req, res, (err) => {
 if (err) return res.status(400).json({ mensaje: err.message });
 next();
});

router.use(authMiddleware);
router.get('/', controller.listar);
router.get('/liquidaciones', controller.listarLiquidaciones);
router.get('/pagos', controller.listarPagos);
router.get('/medios-pago', controller.listarMediosPago);
router.get('/:id/pagos', controller.obtenerPagos);
router.get('/:id/pagos/:pagoId', controller.obtenerPago);
router.post('/calcular', controller.calcular);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.post('/:id/registrar', controller.registrar);
router.post('/:id/liquidaciones', controller.crearLiquidacion);
router.patch('/:id/liquidaciones/:liqId', controller.cambiarEstadoLiquidacion);
router.post('/:id/impulsos', archivo, controller.crearImpulso);
router.post('/:id/pagos', archivo, controller.crearPago);
router.post('/:id/acreditaciones', archivo, controller.crearAcreditacion);
router.post('/:id/intimaciones', archivo, controller.crearIntimacion);
router.post('/:id/cerrar', controller.cerrar);
router.put('/:id/prorrateo', controller.guardarProrrateo);
router.put('/:id/factura', archivo, controller.guardarFactura);
router.delete('/:id/pagos/:pagoId', controller.anularPago);
router.delete('/:id/liquidaciones/:liqId', controller.anularLiquidacion);
router.delete('/:id', controller.darDeBaja);
router.patch('/:id/modo', controller.cambiarModo);
module.exports = router;
