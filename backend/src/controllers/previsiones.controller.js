const service = require('../services/previsiones.service');
const wrap = (fn, status = 200) => async (req, res) => {
 try { const data = await fn(req); res.status(status).json(data); }
 catch (error) {
  console.error('Error en previsiones:', error);
  res.status(error.status ?? 500).json({
   mensaje: error.mensaje ?? (error.status ? error.message : 'Error interno en previsiones'),
   ...(process.env.NODE_ENV !== 'production' ? { detalle: error.message } : {})
  });
 }
};
module.exports = {
 listar: wrap(req => service.listar(req.query)),
 obtener: wrap(req => service.obtener(req.params.id)),
 listarLiquidaciones: wrap(() => service.listarLiquidaciones()),
 listarPagos: wrap(() => service.listarPagos()),
 listarMediosPago: wrap(() => service.listarMediosPago()),
 obtenerPagos: wrap(req => service.obtenerPagos(req.params.id)),
 obtenerPago: wrap(req => service.obtenerPago(req.params.id, req.params.pagoId)),
 crear: wrap(req => service.crear(req.body), 201),
 calcular: wrap(req => service.calcular(req.body)),
 actualizar: wrap(req => service.actualizar(req.params.id, req.body)),
 registrar: wrap(req => service.registrar(req.params.id, req.body)),
 crearLiquidacion: wrap(req => service.crearLiquidacion(req.params.id, req.body), 201),
 cambiarEstadoLiquidacion: wrap(req => service.cambiarEstadoLiquidacion(req.params.id, req.params.liqId, req.body)),
 crearPago: wrap(req => service.crearPago(req.params.id, req.body), 201),
 cambiarModo: wrap(req => service.cambiarModo(req.params.id, req.body))
};
