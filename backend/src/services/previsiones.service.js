const { sql, conectarBD } = require('../config/db');
const repo = require('../repositories/previsiones.repository');
const mov = require('../repositories/previsionMovimientos.repository');
const documentosRepo = require('../repositories/documentos.repository');
const tareasRepo = require('../repositories/tareas.repository');
const { subirDocumentoACloudinary, eliminarDocumentoDeCloudinary } = require('./cloudinaryDocumento.service');
const estados = require('./previsionEstado.service');
const calculo = require('./liquidacion.service');

const { ESTADO } = estados;
const PRIORIDAD_MEDIA = 2;        // si el expediente no tiene prioridad (la columna admite NULL)
const ESTADO_TAREA_PENDIENTE = 1;
const DIAS_NOTIFICACION = 5;      // la tarea de notificación vence a los 5 días (sección 1)

function fail(status, mensaje) { throw Object.assign(new Error(mensaje), { status, mensaje }); }
function id(v, campo) {
 const n = Number(v);
 if (!Number.isSafeInteger(n) || n <= 0) fail(400, `${campo} debe ser un entero positivo`);
 return n;
}
function decimal(v, campo, requerido = true, max = 9999999999999999.99, decimales = 2) {
 if (v == null || v === '') {
  if (requerido) fail(400, `${campo} es obligatorio`);
  return null;
 }
 if (typeof v === 'boolean' || !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > max)
  fail(400, `${campo} inválido`);
 const value = Number(v);
 if (Math.abs(value * (10 ** decimales) - Math.round(value * (10 ** decimales))) > 0.000001)
  fail(400, `${campo} debe tener como máximo ${decimales} decimales`);
 return value;
}
function fecha(v, campo, requerido = false) {
 if (v == null || v === '') {
  if (requerido) fail(400, `${campo} es obligatorio`);
  return null;
 }
 if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(400, `${campo}: usar YYYY-MM-DD`);
 const d = new Date(`${v}T00:00:00Z`);
 if (isNaN(d.getTime()) || d.toISOString().slice(0,10) !== v) fail(400, `${campo} inválida`);
 return v;
}
function texto(v, campo, max) {
 if (v == null) return null;
 if (typeof v !== 'string' || v.length > max) fail(400, `${campo} inválido`);
 return v.trim() || null;
}
// En multipart los booleanos llegan como texto.
function bool(v) { return v === true || v === 'true' || v === '1' || v === 1; }
function sumarDias(iso, dias) {
 const d = new Date(`${iso}T00:00:00Z`);
 d.setUTCDate(d.getUTCDate() + dias);
 return d.toISOString().slice(0, 10);
}
function fechaAR(iso) { return iso.split('-').reverse().join('/'); }
// monto previsto = monto base + intereses estimados (los intereses los ingresa el abogado).
function sumarPesos(a, b) { return (Math.round((a ?? 0) * 100) + Math.round((b ?? 0) * 100)) / 100; }

function normalizarItem(a) {
 if (!a || typeof a !== 'object' || Array.isArray(a)) fail(400, 'Ítem inválido');
 return {
  concepto_prevision: id(a.concepto_prevision, 'concepto_prevision'),
  monto_base: decimal(a.monto_base, 'item.monto_base'),
  tasa: a.tasa == null ? null : id(a.tasa, 'item.tasa'),
  tasa_valor: decimal(a.tasa_valor, 'item.tasa_valor', false, 99999.9999, 4),
  monto_previsto: decimal(a.monto_previsto, 'item.monto_previsto', false),
  instancia: texto(a.instancia, 'item.instancia', 50),
  observaciones: a.observaciones ?? null
 };
}
function normalizarPrevision(d, partial = false) {
 if (!d || typeof d !== 'object' || Array.isArray(d)) fail(400, 'Body inválido');
 const o = {};
 const allowed = {
  tipo_obligacion: v => id(v, 'tipo_obligacion'),
  modo: v => { if (!['activo','seguimiento'].includes(v)) fail(400, 'modo inválido'); return v; },
  obligado: v => { if (!['cliente','tercero','contraparte'].includes(v)) fail(400,'obligado inválido'); return v; },
  obligado_detalle: v => texto(v, 'obligado_detalle', 200),
  fecha_resolucion: v => fecha(v, 'fecha_resolucion'),
  fecha_firmeza: v => fecha(v, 'fecha_firmeza'),
  fecha_estimada_pago: v => fecha(v, 'fecha_estimada_pago'),
  ejercicio: v => v == null ? null : id(v, 'ejercicio'),
  monto_base: v => decimal(v, 'monto_base', !partial),
  intereses_estimados: v => decimal(v, 'intereses_estimados', false),
  tasa: v => id(v, 'tasa'),
  tasa_valor: v => decimal(v, 'tasa_valor', false, 99999.9999, 4),
  observaciones: v => v == null ? null : String(v)
 };
 // El monto previsto lo calcula el back en el alta; al editar se puede corregir a mano.
 if (partial) allowed.monto_previsto = v => decimal(v, 'monto_previsto', false);
 if (!partial) o.expediente = id(d.expediente, 'expediente');
 for (const [k, fn] of Object.entries(allowed)) {
  if (d[k] !== undefined) o[k] = fn(d[k]);
  else if (!partial && ['tipo_obligacion','modo','obligado','tasa','monto_base'].includes(k)) fail(400, `${k} es obligatorio`);
 }
 if (d.items !== undefined) {
  if (!Array.isArray(d.items)) fail(400, 'items debe ser un arreglo');
  o.items = d.items.map(normalizarItem);
 }
 return o;
}
function validarObligado(d) {
 if (d.obligado === 'cliente' && d.obligado_detalle) fail(400, 'Para cliente, obligado_detalle debe estar vacío');
 if (d.obligado !== 'cliente' && !d.obligado_detalle)
   fail(400, 'obligado_detalle es obligatorio para tercero o contraparte');
}
function numero(eId, f) { return `EXP-${new Date(f).getUTCFullYear()}-${eId}`; }
function formato(p) {
 return { ...p, numeroExpediente: numero(p.expediente, p.expedienteFechaCreacion),
  cliente: { id: p.clienteId, nombre: p.clienteNombre },
  estado: { id: p.estado_prevision, nombre: p.estadoNombre },
  tipoObligacion: p.tipo_obligacion ? { id: p.tipo_obligacion, nombre: p.tipoObligacionNombre } : null,
  tasaInfo: { id: p.tasa, nombre: p.tasaNombre } };
}
async function withTransaction(fn) {
 const pool = await conectarBD();
 const tx = new sql.Transaction(pool);
 await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try { const r = await fn(tx); await tx.commit(); return r; }
 catch (e) { try { await tx.rollback(); } catch (_) {} throw e; }
}
async function exigirExistente(previsionId, tx = null) {
 // En escrituras, bloquea primero la cabecera de la previsión. Así dos pagos
 // concurrentes no pueden consumir el mismo saldo en transacciones separadas.
 if (tx && !(await repo.bloquear(previsionId, tx))) fail(404, 'Previsión no encontrada');
 const p = await repo.getById(previsionId, tx);
 if (!p) fail(404, 'Previsión no encontrada');
 return p;
}

// Una fila de historial por acción (sección 5), con el estado en que quedó la previsión.
// Si el estado cambió, el detalle suma "anterior → nuevo".
async function historial(tx, previsionId, anterior, accion, detalle, usuarioId) {
 const p = await repo.getById(previsionId, tx);
 const cambio = anterior != null && anterior !== p.estado_prevision
  ? `${estados.NOMBRE_ESTADO[anterior]} → ${p.estadoNombre}` : null;
 await repo.registrarHistorial(previsionId, p.estado_prevision, accion,
  [detalle, cambio].filter(Boolean).join(' · ') || null, usuarioId, tx);
}

// Comprobantes y notas (sección 8): el archivo se sube a Cloudinary antes de abrir la
// transacción, para no retener bloqueos durante la subida. Si después la transacción falla,
// se borra de Cloudinary: no queda ni el movimiento ni el archivo (P-41).
// fn recibe guardarDocumento(tx, datos), que inserta el documento y devuelve su id (o null sin archivo).
async function conArchivo(file, fn) {
 if (!file) return fn(async () => null);
 const subido = await subirDocumentoACloudinary(file);
 const nombre = file.originalname ? Buffer.from(file.originalname, 'latin1').toString('utf8') : `archivo_${Date.now()}`;
 try {
  return await fn(async (tx, datos) => {
   const doc = await documentosRepo.insertarDocumento({
    nombre_archivo: nombre, storage_key: subido.public_id, activo: true, ...datos }, tx);
   return doc.id;
  });
 } catch (e) {
  await eliminarDocumentoDeCloudinary(subido.public_id).catch(err =>
   console.error('No se pudo borrar de Cloudinary el archivo de una operación fallida:', err.message));
  throw e;
 }
}

// Tarea de la previsión (sección 1): automatica = 0 (no bloquea el cambio de estado del
// expediente ni aparece en el checklist de Estados) y enviar_agenda = 1 (sale en la Agenda).
async function crearTarea(tx, p, usuarioId, { titulo, descripcion, vencimiento }) {
 const expediente = await repo.getExpediente(p.expediente, tx);
 const tarea = await tareasRepo.insertarTarea({
  expediente: p.expediente, titulo, descripcion, usuario_creacion: usuarioId,
  prioridad: expediente?.prioridad ?? PRIORIDAD_MEDIA, estado_tarea: ESTADO_TAREA_PENDIENTE,
  fecha_vencimiento: vencimiento, enviar_agenda: true
 }, tx);
 return tarea.id;
}

async function listar(f = {}) {
 const pagina = f.pagina == null ? 1 : id(f.pagina, 'pagina');
 const pageSize = f.pageSize == null ? 25 : id(f.pageSize, 'pageSize');
 if (pageSize > 100) fail(400, 'pageSize máximo 100');
 if (f.estado != null && f.estado !== '') f.estado = id(f.estado, 'estado');
 if (f.tipoObligacion != null && f.tipoObligacion !== '') f.tipoObligacion = id(f.tipoObligacion, 'tipoObligacion');
 if (f.clienteId != null) f.clienteId = id(f.clienteId, 'clienteId');
 if (f.expedienteId != null) {
  const e = await repo.getExpediente(id(f.expedienteId, 'expedienteId'));
  if (!e || !e.activo) fail(404, 'Expediente no encontrado');
  f.expedienteId = e.expediente_principal_id || e.id;
 }
 if (f.modo && !['activo','seguimiento'].includes(f.modo)) fail(400, 'modo inválido');
 const r = await repo.getAll({...f, pagina, pageSize});
 return { data: r.rows.map(formato), total: r.total, pagina, pageSize, resumen: r.resumen };
}

function formatoMovimiento(x) {
 return { ...x, previsionId: x.prevision,
  expedienteNumero: numero(x.expedienteId, x.expedienteFechaCreacion),
  cliente: x.clienteNombre };
}

// Detalle completo (sección 7): todo lo que muestra prevision-detail, con marcas y alertas ya calculadas.
async function obtener(idPrevision) {
 const p = await exigirExistente(id(idPrevision, 'id'));
 const [items, liquidaciones, pagos, impulsos, acreditaciones, intimaciones, prorrateo, factura, hist, documentacionCompleta] =
  await Promise.all([
   repo.items(p.id), mov.getLiquidaciones(p.id), mov.getPagos(p.id), mov.getImpulsos(p.id),
   mov.getAcreditaciones(p.id), mov.getIntimaciones(p.id), repo.getProrrateo(p.id), repo.getFactura(p.id),
   repo.getHistorial(p.id), repo.tieneSentenciaOResolucion(p.id)
  ]);
 const liquidacionVigente = liquidaciones.find(x => x.vigente) ?? null;
 const datos = { items, liquidacionVigente, pagos, acreditaciones, intimaciones, prorrateo, factura, documentacionCompleta };
 return {
  ...formato(p),
  items, liquidaciones, pagos, impulsos, acreditaciones, intimaciones, prorrateo, factura,
  historial: hist, liquidacionVigente,
  marcas: estados.calcularMarcas(p, datos),
  alertas: estados.calcularAlertas(p, datos)
 };
}

async function obtenerPagos(previsionId) {
 const pid = id(previsionId, 'id');
 await exigirExistente(pid);
 return mov.getPagos(pid);
}

async function obtenerPago(previsionId, pagoId) {
 const pid = id(previsionId, 'id');
 const pago = await mov.getPagoById(pid, id(pagoId, 'pagoId'));
 if (!pago) fail(404, 'Pago no encontrado para esta previsión');
 return pago;
}

async function listarMediosPago() {
 return mov.getMediosPago();
}

async function crear(body, usuarioId) {
 const d = normalizarPrevision(body);
 validarObligado(d);
 d.monto_previsto = sumarPesos(d.monto_base, d.intereses_estimados);
 const expediente = await repo.getExpediente(d.expediente);
 if (!expediente || !expediente.activo) fail(404, 'Expediente no encontrado o inactivo');
 if (expediente.causa_id && expediente.expediente_principal_id && expediente.expediente_principal_id !== expediente.id)
   fail(409, 'La previsión debe crearse en el expediente principal de la causa');
 if (!(await repo.getHabilitacion(expediente)))
   fail(409, 'El expediente no está en un estado que permita registrar una previsión');
 const newId = await withTransaction(async tx => {
  const newId = await repo.create(d, usuarioId, tx);
  await repo.replaceItems(newId, d.items ?? [], tx);
  await historial(tx, newId, null, 'Creó la previsión',
   `Monto previsto: ${estados.formatoMonto(d.monto_previsto)}`, usuarioId);
  return newId;
 });
 return obtener(newId);
}
async function actualizar(previsionId, body, usuarioId) {
 const pid = id(previsionId, 'id');
 const d = normalizarPrevision(body, true);
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const effective = {...p, ...d};
  validarObligado(effective);
  if (d.monto_previsto === undefined && (d.monto_base !== undefined || d.intereses_estimados !== undefined)) {
   d.monto_previsto = sumarPesos(effective.monto_base, effective.intereses_estimados);
  }
  await repo.update(pid, d, usuarioId, tx);
  if (d.items !== undefined) await repo.replaceItems(pid, d.items, tx);
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, 'Editó la previsión', null, usuarioId);
 });
 return obtener(pid);
}
// "Registrar previsión" (paso 2): fecha y monto previsto final, en la misma transacción.
async function registrar(previsionId, body = {}, usuarioId) {
 const pid = id(previsionId, 'id');
 const fechaProvisionado = fecha(body.fecha_provisionado, 'fecha_provisionado', true);
 const montoPrevisto = decimal(body.monto_previsto, 'monto_previsto', false);
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEstado(p, [ESTADO.REGISTRADO, ESTADO.EN_ANALISIS],
   'La previsión debe estar en Registrado o En análisis para registrarla');
  await repo.registrar(pid, fechaProvisionado, montoPrevisto, usuarioId, tx);
  await repo.setEstado(pid, ESTADO.CON_PREVISION, tx);
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, 'Registró la previsión',
   `Monto previsto: ${estados.formatoMonto(montoPrevisto ?? p.monto_previsto)}`, usuarioId);
 });
 return obtener(pid);
}
async function cambiarModo(previsionId, body, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || !['activo','seguimiento'].includes(body.modo)) fail(400, 'modo inválido');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  await repo.update(pid, {modo: body.modo}, usuarioId, tx);
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision,
   `Cambió el modo a ${body.modo === 'activo' ? 'Activo' : 'Seguimiento'}`, null, usuarioId);
 });
 return obtener(pid);
}
async function listarLiquidaciones() {
 return (await mov.getLiquidaciones()).map(formatoMovimiento);
}
async function listarPagos() {
 return (await mov.getPagos()).map(formatoMovimiento);
}
// Nueva liquidación: el abogado ingresa capital, intereses y otros; la nueva queda vigente.
// Se permite aunque ya haya pagos (P-16): el saldo pasa a calcularse con la nueva.
async function crearLiquidacion(previsionId, body, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body) fail(400, 'Body obligatorio');
 const desglose = calculo.validarDesglose(body);
 const d = {
  ...desglose,
  prevision: pid,
  fecha_liquidacion: fecha(body.fecha_liquidacion, 'fecha_liquidacion', true),
  estado_liquidacion: id(body.estado_liquidacion ?? 1, 'estado_liquidacion'),
  observaciones: body.observaciones ?? null,
  // Trazabilidad: de dónde salieron los números (sección 4, detalle_calculo).
  detalle_calculo: JSON.stringify({
   origen: 'manual',
   tasaValor: desglose.tasa_valor,
   tasaFechaPublicacion: fecha(body.tasa_fecha_publicacion, 'tasa_fecha_publicacion')
  })
 };
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  await mov.crearLiquidacion(d, usuarioId, tx);
  // Acreditado → Con previsión: el juzgado intimó una diferencia y la nueva liquidación
  // supera lo pagado (sección 6, paso 6). Desde ahí sigue el circuito normal.
  if (p.estado_prevision === ESTADO.ACREDITADO) {
   const pagado = await mov.resumenPagos(pid, tx);
   if (estados.aCentavos(d.total.toFixed(2)) > estados.aCentavos(pagado.totalPagadoExacto)) {
    await repo.setEstado(pid, ESTADO.CON_PREVISION, tx);
   }
  }
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, 'Cargó una liquidación',
   `Total ${estados.formatoMonto(d.total)}`, usuarioId);
 });
 return obtener(pid);
}
async function cambiarEstadoLiquidacion(previsionId, liqId, body, usuarioId) {
 const pid = id(previsionId, 'id');
 const lid = id(liqId, 'liqId');
 const estado = id(body?.estado_liquidacion, 'estado_liquidacion');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const vigente = await mov.vigente(pid, tx);
  if (!vigente || vigente.id !== lid) fail(404, 'Liquidación vigente no encontrada');
  const pagado = await mov.resumenPagos(pid, tx);
  const totalPagadoCentavos = estados.aCentavos(pagado.totalPagadoExacto);
  if (vigente.estado_liquidacion === estados.LIQUIDACION_APROBADA &&
      estado !== estados.LIQUIDACION_APROBADA && totalPagadoCentavos > 0n) {
   fail(409, 'No se puede quitar la aprobación de una liquidación con pagos registrados');
  }
  // Se puede aprobar aunque lo pagado supere el total (mismo criterio que P-22): queda saldo a favor.
  if (estado === estados.LIQUIDACION_APROBADA && vigente.total === null) {
   fail(409, 'La liquidación necesita un total antes de aprobarse');
  }
  await mov.cambiarEstadoLiquidacion(pid, lid, estado, usuarioId, tx);
  await estados.recalcular(pid, repo, mov, tx);
  const liq = (await mov.getLiquidaciones(pid, tx)).find(x => x.id === lid);
  await historial(tx, pid, p.estado_prevision,
   `Cambió la liquidación N° ${liq?.numero ?? lid} a ${liq?.estadoNombre ?? 'otro estado'}`, null, usuarioId);
 });
 return obtener(pid);
}
// Solicitud de pago a la Administración del cliente (impulso), con la nota adjunta.
async function crearImpulso(previsionId, body, file, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const fechaImpulso = fecha(body.fecha, 'fecha', true);
 const monto = decimal(body.monto, 'monto');
 if (monto <= 0) fail(400, 'monto debe ser positivo');
 const observaciones = texto(body.observaciones, 'observaciones', 2147483647);
 await conArchivo(file, guardarDocumento => withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEstado(p, [ESTADO.LISTO],
   'La previsión debe estar en Listo para impulsar para registrar la solicitud de pago');
  const documento = await guardarDocumento(tx, {
   expediente: p.expediente, prevision: pid, usuario_creacion: usuarioId,
   tipo_documento: await repo.tipoDocumentoId('Nota', tx),
   descripcion: 'Solicitud de pago a la Administración del cliente', fecha_documento: fechaImpulso
  });
  // Si ya hubo una solicitud, esta es por la diferencia que quedó después de un pago parcial (P-20).
  const esDiferencia = (await mov.contarImpulsos(pid, tx)) > 0;
  await mov.crearImpulso({ prevision: pid, fecha: fechaImpulso, monto, es_diferencia: esDiferencia,
   documento, observaciones }, usuarioId, tx);
  await repo.setEstado(pid, ESTADO.IMPULSADO, tx);
  await historial(tx, pid, p.estado_prevision, 'Registró la solicitud de pago',
   `${estados.formatoMonto(monto)}${esDiferencia ? ' (por la diferencia)' : ''}`, usuarioId);
 }));
 return obtener(pid);
}
// Pago (sección 6): en Activo después del impulso; en Seguimiento desde Con previsión.
// Se acepta aunque supere el saldo (P-22): el saldo queda ≤ 0 y la previsión pasa a Pagado.
async function crearPago(previsionId, body, file, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const pagador = String(body.pagador ?? '').toUpperCase();
 if (!['CLIENTE','CONTRAPARTE','TERCERO'].includes(pagador)) fail(400, 'pagador inválido');
 const monto = decimal(body.monto, 'monto');
 if (monto <= 0) fail(400, 'monto debe ser positivo');
 // DECIMAL(18,2) permite más valores que los centavos exactos de JS Number.
 // Limitamos el request a valores que pueden validarse sin pérdida de precisión.
 if (!Number.isSafeInteger(Math.round(monto * 100))) {
  fail(400, 'monto demasiado grande para procesarlo con precisión');
 }
 const d = {
  prevision: pid,
  fecha_pago: fecha(body.fecha_pago, 'fecha_pago', true),
  monto,
  pagador,
  pagador_detalle: texto(body.pagador_detalle, 'pagador_detalle', 200),
  medio_pago: id(body.medio_pago, 'medio_pago'),
  referencia: texto(body.referencia, 'referencia', 200),
  observaciones: texto(body.observaciones, 'observaciones', 2147483647)
 };
 if (pagador !== 'CLIENTE' && !d.pagador_detalle) {
  fail(400, 'pagador_detalle es obligatorio para CONTRAPARTE o TERCERO');
 }
 let pagoCreadoId;
 await conArchivo(file, guardarDocumento => withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const permitido = p.estado_prevision === ESTADO.IMPULSADO ||
   (p.modo === 'seguimiento' && p.estado_prevision === ESTADO.CON_PREVISION);
  if (!permitido) fail(409, 'La previsión no está en un estado que permita registrar pagos');
  if (!(await mov.existeMedioPago(d.medio_pago, tx))) fail(400, 'medio_pago inexistente');
  d.documento = await guardarDocumento(tx, {
   expediente: p.expediente, prevision: pid, usuario_creacion: usuarioId,
   tipo_documento: await repo.tipoDocumentoId('Comprobante de pago', tx),
   descripcion: 'Comprobante de pago', fecha_documento: d.fecha_pago
  });
  pagoCreadoId = await mov.crearPago(d, usuarioId, tx);
  await estados.recalcular(pid, repo, mov, tx, { trasPago: true });
  const quien = pagador === 'CLIENTE' ? 'Cliente' : `${pagador === 'TERCERO' ? 'Tercero' : 'Contraparte'}: ${d.pagador_detalle}`;
  await historial(tx, pid, p.estado_prevision, 'Registró un pago',
   `${estados.formatoMonto(monto)} — ${quien}`, usuarioId);
 }));
 const detalle = await obtener(pid);
 return { ...detalle, pagoCreadoId };
}

// ---------- Bloque B ----------

// Acreditación (paso 6): el juzgado tiene por acreditado el pago. Si el proveído ordena
// notificar, se crea la tarea de notificación (vence a los 5 días) y no se puede cerrar
// hasta cumplirla (P-27).
async function crearAcreditacion(previsionId, body, file, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const fechaAcreditacion = fecha(body.fecha, 'fecha', true);
 const ordenaNotificar = bool(body.ordena_notificar);
 await conArchivo(file, guardarDocumento => withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEstado(p, [ESTADO.PAGADO], 'La previsión debe estar en Pagado para registrar la acreditación');
  if (p.saldo !== null && Number(p.saldo) > 0) fail(409, 'Para acreditar, el saldo tiene que estar cubierto');
  const documento = await guardarDocumento(tx, {
   expediente: p.expediente, prevision: pid, usuario_creacion: usuarioId,
   tipo_documento: await repo.tipoDocumentoId('Proveído', tx),
   descripcion: 'Proveído que tiene por acreditado el pago', fecha_documento: fechaAcreditacion
  });
  const tarea = ordenaNotificar ? await crearTarea(tx, p, usuarioId, {
   titulo: 'Notificar acreditación de pago',
   descripcion: `El proveído del ${fechaAR(fechaAcreditacion)} que tiene por acreditado el pago ordenó notificar a las partes (previsión #${pid}).`,
   vencimiento: sumarDias(fechaAcreditacion, DIAS_NOTIFICACION)
  }) : null;
  await mov.crearAcreditacion({ prevision: pid, fecha: fechaAcreditacion, documento,
   ordena_notificar: ordenaNotificar, tarea }, usuarioId, tx);
  await repo.setEstado(pid, ESTADO.ACREDITADO, tx);
  await historial(tx, pid, p.estado_prevision, 'Registró la acreditación',
   tarea ? `Ordenó notificar: tarea #${tarea} en Agenda` : null, usuarioId);
 }));
 return obtener(pid);
}

// Intimación de pago (sección 6): no cambia el estado. Crea la tarea "Vence intimación de pago".
async function crearIntimacion(previsionId, body, file, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const d = {
  prevision: pid,
  fecha: fecha(body.fecha, 'fecha', true),
  fecha_vencimiento: fecha(body.fecha_vencimiento, 'fecha_vencimiento', true),
  apercibimiento: texto(body.apercibimiento, 'apercibimiento', 100),
  observaciones: texto(body.observaciones, 'observaciones', 2147483647)
 };
 if (d.fecha_vencimiento < d.fecha) fail(400, 'El vencimiento no puede ser anterior a la notificación');
 await conArchivo(file, guardarDocumento => withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEstado(p,
   [ESTADO.REGISTRADO, ESTADO.EN_ANALISIS, ESTADO.CON_PREVISION, ESTADO.LISTO, ESTADO.IMPULSADO],
   'La intimación se registra mientras quede algo por pagar (hasta Impulsado)');
  d.documento = await guardarDocumento(tx, {
   expediente: p.expediente, prevision: pid, usuario_creacion: usuarioId,
   tipo_documento: await repo.tipoDocumentoId('Notificación', tx),
   descripcion: 'Cédula o proveído de la intimación de pago', fecha_documento: d.fecha
  });
  d.tarea = await crearTarea(tx, p, usuarioId, {
   titulo: 'Vence intimación de pago',
   descripcion: `Intimación notificada el ${fechaAR(d.fecha)}${d.apercibimiento ? `, bajo apercibimiento de ${d.apercibimiento}` : ''} (previsión #${pid}).`,
   vencimiento: d.fecha_vencimiento
  });
  await mov.crearIntimacion(d, usuarioId, tx);
  await historial(tx, pid, p.estado_prevision, 'Registró intimación de pago',
   `Vence el ${fechaAR(d.fecha_vencimiento)}`, usuarioId);
 }));
 return obtener(pid);
}

// Cierre (paso 7): Acreditado, sin saldo y sin notificación pendiente.
async function cerrar(previsionId, usuarioId) {
 const pid = id(previsionId, 'id');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEstado(p, [ESTADO.ACREDITADO], 'La previsión debe estar en Acreditado para cerrarla');
  if (p.saldo !== null && Number(p.saldo) > 0) fail(409, 'No se puede cerrar con saldo pendiente');
  if (await mov.notificacionPendiente(pid, tx)) {
   fail(409, 'Hay una notificación pendiente: cumplí la tarea antes de cerrar');
  }
  await repo.setEstado(pid, ESTADO.CERRADO, tx);
  await historial(tx, pid, p.estado_prevision, 'Cerró la previsión', null, usuarioId);
 });
 return obtener(pid);
}

// Prorrateo art. 730. Guardar desde la pantalla = el abogado verificó la resolución.
async function guardarProrrateo(previsionId, body, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const d = {
  aprobado: bool(body.aprobado),
  verificado: bool(body.verificado),
  fecha_aprobacion: fecha(body.fecha_aprobacion, 'fecha_aprobacion'),
  resolucion: texto(body.resolucion, 'resolucion', 200),
  base_calculo: decimal(body.base_calculo, 'base_calculo', false),
  honorarios_sujetos: decimal(body.honorarios_sujetos, 'honorarios_sujetos', false),
  coeficiente: decimal(body.coeficiente, 'coeficiente', false, 999.999999, 6),
  monto_prorrateado: decimal(body.monto_prorrateado, 'monto_prorrateado', false)
 };
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  await repo.guardarProrrateo(pid, d, usuarioId, tx);
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, 'Actualizó el prorrateo art. 730',
   d.aprobado ? `Aprobado${d.verificado ? ' y verificado' : ', sin verificar'}` : 'No aprobado', usuarioId);
 });
 return obtener(pid);
}

// Factura de honorarios (multipart): cargar o reemplazar. Sin archivo nuevo se conserva el anterior.
async function guardarFactura(previsionId, body, file, usuarioId) {
 const pid = id(previsionId, 'id');
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Body obligatorio');
 const d = {
  profesional: texto(body.profesional, 'profesional', 200),
  monto: decimal(body.monto, 'monto'),
  fecha: fecha(body.fecha, 'fecha', true)
 };
 if (!d.profesional) fail(400, 'profesional es obligatorio');
 if (d.monto <= 0) fail(400, 'monto debe ser positivo');
 await conArchivo(file, guardarDocumento => withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const anterior = await repo.getFactura(pid, tx);
  d.documento = await guardarDocumento(tx, {
   expediente: p.expediente, prevision: pid, usuario_creacion: usuarioId,
   tipo_documento: await repo.tipoDocumentoId('Factura', tx),
   descripcion: `Factura de honorarios de ${d.profesional}`, fecha_documento: d.fecha
  });
  await repo.guardarFactura(pid, d, usuarioId, tx);
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision,
   anterior ? 'Reemplazó la factura de honorarios' : 'Cargó la factura de honorarios',
   `${d.profesional} — ${estados.formatoMonto(d.monto)}`, usuarioId);
 }));
 return obtener(pid);
}

// ---------- Anulaciones y baja (sección 1: no se edita, se anula) ----------

// Anular un pago cargado por error: queda con activo = 0 (el comprobante se conserva) y se recalcula el estado.
// En una previsión Acreditada no se anula: el juzgado ya tuvo el pago por acreditado.
async function anularPago(previsionId, pagoId, usuarioId) {
 const pid = id(previsionId, 'id');
 const pgid = id(pagoId, 'pagoId');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  if (p.estado_prevision === ESTADO.ACREDITADO) {
   fail(409, 'No se puede anular un pago de una previsión acreditada');
  }
  const pago = await mov.anularPago(pid, pgid, usuarioId, tx);
  if (!pago) fail(404, 'Pago no encontrado para esta previsión');
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, 'Anuló un pago',
   `${estados.formatoMonto(pago.monto)} del ${fechaAR(new Date(pago.fecha_pago).toISOString().slice(0, 10))}`, usuarioId);
 });
 return obtener(pid);
}

// Anular una liquidación cargada por error. Si era la vigente, vuelve a quedar vigente la anterior.
async function anularLiquidacion(previsionId, liqId, usuarioId) {
 const pid = id(previsionId, 'id');
 const lid = id(liqId, 'liqId');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  if (p.estado_prevision === ESTADO.ACREDITADO) {
   fail(409, 'No se puede anular una liquidación de una previsión acreditada');
  }
  const liq = await mov.anularLiquidacion(pid, lid, usuarioId, tx);
  if (!liq) fail(404, 'Liquidación no encontrada para esta previsión');
  await estados.recalcular(pid, repo, mov, tx);
  await historial(tx, pid, p.estado_prevision, `Anuló la liquidación N° ${liq.numero}`,
   `Total ${estados.formatoMonto(liq.total)}`, usuarioId);
 });
 return obtener(pid);
}

// Baja lógica (sección 5): solo sin pagos registrados.
async function darDeBaja(previsionId, usuarioId) {
 const pid = id(previsionId, 'id');
 let numeroExpediente;
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  const pagos = await mov.resumenPagos(pid, tx);
  if (Number(pagos.cantidadPagos) > 0) fail(409, 'No se puede dar de baja una previsión con pagos registrados');
  numeroExpediente = numero(p.expediente, p.expedienteFechaCreacion);
  await historial(tx, pid, p.estado_prevision, 'Dio de baja la previsión', null, usuarioId);
  await repo.darDeBaja(pid, usuarioId, tx);
 });
 return { id: pid, numeroExpediente, activo: false };
}

module.exports = {
 anularPago, anularLiquidacion, darDeBaja,
 listar, obtener, obtenerPagos, obtenerPago, listarMediosPago,
 crear, actualizar, registrar, cambiarModo,
 listarLiquidaciones, listarPagos, crearLiquidacion, cambiarEstadoLiquidacion,
 crearImpulso, crearPago, crearAcreditacion, crearIntimacion, cerrar, guardarProrrateo, guardarFactura,
 calcular: calculo.previsualizar
};
