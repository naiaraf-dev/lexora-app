const { sql, conectarBD } = require('../config/db');
const repo = require('../repositories/previsiones.repository');
const mov = require('../repositories/previsionMovimientos.repository');
const estados = require('./previsionEstado.service');
const calculo = require('./liquidacion.service');

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
function normalizarItem(a) {
 if (!a || typeof a !== 'object' || Array.isArray(a)) fail(400, 'Ítem inválido');
 return {
  concepto_prevision: id(a.concepto_prevision, 'concepto_prevision'),
  monto_base: decimal(a.monto_base, 'item.monto_base'),
  tasa: a.tasa == null ? null : id(a.tasa, 'item.tasa'),
  // En la BD es NOT NULL incluso cuando no se seleccionó una tasa.
  tasa_valor: decimal(a.tasa_valor ?? (a.tasa == null ? 0 : null), 'item.tasa_valor', true, 99999.9999, 4),
  monto_previsto: decimal(a.monto_previsto, 'item.monto_previsto', false),
  instancia: texto(a.instancia, 'item.instancia', 50),
  observaciones: a.observaciones ?? null
 };
}
function normalizarPrevision(d, partial = false) {
 if (!d || typeof d !== 'object' || Array.isArray(d)) fail(400, 'Body inválido');
 const o = {};
 const allowed = {
  modo: v => { if (!['activo','seguimiento'].includes(v)) fail(400, 'modo inválido'); return v; },
  obligado: v => { if (!['cliente','tercero','contraparte'].includes(v)) fail(400,'obligado inválido'); return v; },
  obligado_detalle: v => texto(v, 'obligado_detalle', 200),
  fecha_resolucion: v => fecha(v, 'fecha_resolucion'),
  fecha_firmeza: v => fecha(v, 'fecha_firmeza'),
  fecha_estimada_pago: v => fecha(v, 'fecha_estimada_pago'),
  ejercicio: v => v == null ? null : id(v, 'ejercicio'),
  monto_base: v => decimal(v, 'monto_base', false),
  tasa: v => id(v, 'tasa'),
  tasa_valor: v => decimal(v, 'tasa_valor', true, 99999.9999, 4),
  monto_previsto: v => decimal(v, 'monto_previsto', false),
  observaciones: v => v == null ? null : String(v)
 };
 if (!partial) o.expediente = id(d.expediente, 'expediente');
 for (const [k, fn] of Object.entries(allowed)) {
  if (d[k] !== undefined) o[k] = fn(d[k]);
  else if (!partial && ['modo','obligado','tasa','tasa_valor'].includes(k)) fail(400, `${k} es obligatorio`);
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
 const p = await repo.getById(previsionId, tx);
 if (!p) fail(404, 'Previsión no encontrada');
 return p;
}
async function listar(f = {}) {
 if (f.tipoObligacion !== undefined) fail(400, 'El filtro tipoObligacion no está disponible: la tabla prevision no tiene ese campo');
 const pagina = f.pagina == null ? 1 : id(f.pagina, 'pagina');
 const pageSize = f.pageSize == null ? 25 : id(f.pageSize, 'pageSize');
 if (pageSize > 100) fail(400, 'pageSize máximo 100');
 if (f.estado != null) f.estado = id(f.estado, 'estado');
 if (f.clienteId != null) f.clienteId = id(f.clienteId, 'clienteId');
 if (f.expedienteId != null) {
  const e = await repo.getExpediente(id(f.expedienteId, 'expedienteId'));
  if (!e || !e.activo) fail(404, 'Expediente no encontrado');
  f.expedienteId = e.expediente_principal_id || e.id;
 }
 if (f.modo && !['activo','seguimiento'].includes(f.modo)) fail(400, 'modo inválido');
 const r = await repo.getAll({...f, pagina, pageSize});
 return { data: r.rows.map(formato), total: r.total, pagina, pageSize };
}
async function obtener(idPrevision) {
 const p = await exigirExistente(id(idPrevision, 'id'));
 const [items, liquidaciones, pagos] = await Promise.all([
  repo.items(p.id), mov.getLiquidaciones(p.id), mov.getPagos(p.id)
 ]);
 const vigente = liquidaciones.find(x => x.vigente) ?? null;
 const totalPagado = pagos.reduce((s,x) => s + Math.round(Number(x.monto)*100), 0) / 100;
 const saldo = vigente?.total == null ? null :
   (Math.round(Number(vigente.total)*100) - Math.round(totalPagado*100))/100;
 return { ...formato(p), items, liquidaciones, pagos, liquidacionVigente: vigente,
   totalPagado, saldo };
}
async function crear(body) {
 const d = normalizarPrevision(body);
 validarObligado(d);
 const expediente = await repo.getExpediente(d.expediente);
 if (!expediente || !expediente.activo) fail(404, 'Expediente no encontrado o inactivo');
 if (expediente.causa_id && expediente.expediente_principal_id !== expediente.id)
   fail(409, 'La previsión debe crearse en el expediente principal de la causa');
 const h = await repo.getHabilitacion(expediente);
 if (h === false) fail(409, 'El estado del expediente no habilita previsiones');
 // h null: la columna habilita_prevision no existe, por lo que no se puede validar esa regla.
 const newId = await withTransaction(async tx => {
  const newId = await repo.create(d, tx);
  await repo.replaceItems(newId, d.items ?? [], tx);
  return newId;
 });
 return obtener(newId);
}
async function actualizar(previsionId, body) {
 const pid = id(previsionId, 'id');
 const d = normalizarPrevision(body, true);
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const effective = {...p, ...d};
  validarObligado(effective);
  await repo.update(pid, d, tx);
  if (d.items !== undefined) await repo.replaceItems(pid, d.items, tx);
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
async function registrar(previsionId, body = {}) {
 const pid = id(previsionId, 'id');
 fecha(body.fecha_provisionado, 'fecha_provisionado', true);
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  if (![1,2].includes(p.estado_prevision)) fail(409, 'Solo se puede registrar en estado Registrado o En análisis');
  await repo.registrar(pid, body.fecha_provisionado, tx);
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
async function cambiarModo(previsionId, body) {
 const pid = id(previsionId, 'id');
 if (!body || !['activo','seguimiento'].includes(body.modo)) fail(400, 'modo inválido');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  await repo.update(pid, {modo: body.modo}, tx);
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
async function listarLiquidaciones() {
 const data = await mov.getLiquidaciones();
 return data.map(x => ({...x, previsionId: x.prevision,
  expedienteNumero: numero(x.expedienteId, x.expedienteFechaCreacion),
  cliente: x.clienteNombre}));
}
async function listarPagos() {
 const data = await mov.getPagos();
 return data.map(x => ({...x, previsionId: x.prevision,
  expedienteNumero: numero(x.expedienteId, x.expedienteFechaCreacion),
  cliente: x.clienteNombre}));
}
async function crearLiquidacion(previsionId, body) {
 const pid = id(previsionId, 'id');
 if (!body) fail(400, 'Body obligatorio');
 const d = {
  prevision: pid,
  fecha_liquidacion: fecha(body.fecha_liquidacion, 'fecha_liquidacion'),
  fecha_desde: fecha(body.fecha_desde, 'fecha_desde'),
  fecha_hasta: fecha(body.fecha_hasta, 'fecha_hasta'),
  tasa: id(body.tasa, 'tasa'),
  tasa_valor: decimal(body.tasa_valor, 'tasa_valor', true, 99999.9999, 4),
  total: decimal(body.total, 'total'),
  estado_liquidacion: id(body.estado_liquidacion ?? 1, 'estado_liquidacion'),
  observaciones: body.observaciones ?? null
 };
 if (d.fecha_desde && d.fecha_hasta && d.fecha_desde > d.fecha_hasta) fail(400,'Fechas invertidas');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const pagos = await mov.totalPagado(pid, tx);
  if (pagos > 0) fail(409, 'No se puede sustituir la liquidación después de registrar pagos sin un mecanismo de conciliación');
  await mov.crearLiquidacion(d, tx);
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
async function cambiarEstadoLiquidacion(previsionId, liqId, body) {
 const pid = id(previsionId, 'id');
 const lid = id(liqId, 'liqId');
 const estado = id(body?.estado_liquidacion, 'estado_liquidacion');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  const ok = await mov.cambiarEstadoLiquidacion(pid, lid, estado, tx);
  if (!ok) fail(404, 'Liquidación vigente no encontrada');
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
async function crearPago(previsionId, body) {
 const pid = id(previsionId, 'id');
 if (!body) fail(400, 'Body obligatorio');
 const pagador = String(body.pagador ?? '').toUpperCase();
 if (!['CLIENTE','CONTRAPARTE','TERCERO'].includes(pagador)) fail(400, 'pagador inválido');
 const monto = decimal(body.monto, 'monto');
 if (monto <= 0) fail(400, 'monto debe ser positivo');
 const d = {
  prevision: pid, fecha_pago: fecha(body.fecha_pago, 'fecha_pago', true), monto, pagador,
  pagador_detalle: texto(body.pagador_detalle, 'pagador_detalle', 200),
  medio_pago: id(body.medio_pago, 'medio_pago'),
  referencia: texto(body.referencia, 'referencia', 200),
  storage_key: texto(body.storage_key, 'storage_key', 500),
  observaciones: body.observaciones ?? null
 };
 if (pagador !== 'CLIENTE' && !d.pagador_detalle) fail(400, 'pagador_detalle obligatorio');
 await withTransaction(async tx => {
  const p = await exigirExistente(pid, tx);
  estados.exigirEditable(p);
  if (!p.fecha_provisionado) fail(409,'Primero debe registrarse la previsión');
  const l = await mov.vigente(pid, tx);
  if (!l || l.estado_liquidacion !== 4 || l.total === null)
    fail(409, 'Se requiere una liquidación vigente aprobada/firme con total');
  const pagado = await mov.totalPagado(pid, tx);
  if (Math.round((pagado + monto)*100) > Math.round(Number(l.total)*100))
    fail(409, 'El pago supera el saldo de la liquidación vigente');
  await mov.crearPago(d, tx);
  await estados.recalcular(pid, repo, mov, tx);
 });
 return obtener(pid);
}
module.exports = { listar, obtener, crear, actualizar, registrar, cambiarModo,
 listarLiquidaciones, listarPagos, crearLiquidacion, cambiarEstadoLiquidacion,
 crearPago, calcular: calculo.previsualizar };
