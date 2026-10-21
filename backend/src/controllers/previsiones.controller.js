const service = require('../services/previsiones.service');
const logs = require('../services/logs.service');
const { ACCIONES, MODULOS, RESULTADOS } = require('../constants/log.constants');

// log (opcional): { accion, que } registra la escritura en el log de seguridad, igual que clientes.
// "que" describe la operación ("cargó una liquidación"); se arma el texto con el id de la previsión.
const wrap = (fn, status = 200, log = null) => async (req, res) => {
 try {
  const data = await fn(req);
  if (log) {
   await logs.registrarEvento(req, { accion: log.accion, modulo: MODULOS.PREVISIONES,
    descripcion: `${capitalizar(log.que)} ${referencia(req, data)}` });
  }
  res.status(status).json(data);
 }
 catch (error) {
  console.error('Error en previsiones:', error);
  if (log) {
   await logs.registrarEvento(req, { accion: log.accion, modulo: MODULOS.PREVISIONES, resultado: RESULTADOS.ERROR,
    descripcion: `Error al intentar: ${log.que} ${referencia(req)}: ${error.mensaje ?? error.message}` });
  }
  res.status(error.status ?? 500).json({
   mensaje: error.mensaje ?? (error.status ? error.message : 'Error interno en previsiones'),
   ...(process.env.NODE_ENV !== 'production' ? { detalle: error.message } : {})
  });
 }
};
const capitalizar = t => t.charAt(0).toUpperCase() + t.slice(1);
// "(previsión #12, EXP-2026-34)": sin montos ni datos personales, como el log de clientes.
function referencia(req, data) {
 const id = data?.id ?? req.params.id;
 if (!id) return '(nueva previsión)';
 return `(previsión #${id}${data?.numeroExpediente ? `, ${data.numeroExpediente}` : ''})`;
}
const alta = que => ({ accion: ACCIONES.ALTA, que });
const edicion = que => ({ accion: ACCIONES.EDICION, que });
const eliminacion = que => ({ accion: ACCIONES.ELIMINACION, que });

// El usuario sale del token (authMiddleware): se usa para la auditoría y los documentos.
const usuario = req => req.usuario?.id;
module.exports = {
 listar: wrap(req => service.listar(req.query)),
 obtener: wrap(req => service.obtener(req.params.id)),
 listarLiquidaciones: wrap(() => service.listarLiquidaciones()),
 listarPagos: wrap(() => service.listarPagos()),
 listarMediosPago: wrap(() => service.listarMediosPago()),
 obtenerPagos: wrap(req => service.obtenerPagos(req.params.id)),
 obtenerPago: wrap(req => service.obtenerPago(req.params.id, req.params.pagoId)),
 crear: wrap(req => service.crear(req.body, usuario(req)), 201, alta('dio de alta la previsión')),
 calcular: wrap(req => service.calcular(req.body)),
 actualizar: wrap(req => service.actualizar(req.params.id, req.body, usuario(req)), 200, edicion('editó la previsión')),
 registrar: wrap(req => service.registrar(req.params.id, req.body, usuario(req)), 200, edicion('registró la previsión')),
 crearLiquidacion: wrap(req => service.crearLiquidacion(req.params.id, req.body, usuario(req)), 201,
  alta('cargó una liquidación')),
 cambiarEstadoLiquidacion: wrap(req => service.cambiarEstadoLiquidacion(req.params.id, req.params.liqId, req.body, usuario(req)), 200,
  edicion('cambió el estado de una liquidación')),
 crearImpulso: wrap(req => service.crearImpulso(req.params.id, req.body, req.file, usuario(req)), 201,
  alta('registró una solicitud de pago')),
 crearPago: wrap(req => service.crearPago(req.params.id, req.body, req.file, usuario(req)), 201, alta('registró un pago')),
 crearAcreditacion: wrap(req => service.crearAcreditacion(req.params.id, req.body, req.file, usuario(req)), 201,
  alta('registró una acreditación')),
 crearIntimacion: wrap(req => service.crearIntimacion(req.params.id, req.body, req.file, usuario(req)), 201,
  alta('registró una intimación de pago')),
 cerrar: wrap(req => service.cerrar(req.params.id, usuario(req)), 200, edicion('cerró la previsión')),
 guardarProrrateo: wrap(req => service.guardarProrrateo(req.params.id, req.body, usuario(req)), 200,
  edicion('actualizó el prorrateo art. 730')),
 guardarFactura: wrap(req => service.guardarFactura(req.params.id, req.body, req.file, usuario(req)), 200,
  edicion('cargó la factura de honorarios')),
 cambiarModo: wrap(req => service.cambiarModo(req.params.id, req.body, usuario(req)), 200, edicion('cambió el modo')),
 anularPago: wrap(req => service.anularPago(req.params.id, req.params.pagoId, usuario(req)), 200, eliminacion('anuló un pago')),
 anularLiquidacion: wrap(req => service.anularLiquidacion(req.params.id, req.params.liqId, usuario(req)), 200,
  eliminacion('anuló una liquidación')),
 darDeBaja: wrap(req => service.darDeBaja(req.params.id, usuario(req)), 200, eliminacion('dio de baja la previsión'))
};
