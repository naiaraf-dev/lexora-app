// 🔴 MOCK — Todo este archivo se borra cuando esté el back de previsiones.
// Imita lo que va a devolver /api/previsiones, incluido un motor de estados simplificado
// (en el back vive en previsionEstado.service.js). Sirve para probar el flujo completo en pantalla.

import { Alerta, PrevisionDetalle, PrevisionResumen } from '../models/prevision.model';
import { UiSelectOption } from '../../../shared/components/ui-select/ui-select';

/** Catálogos que en el back salen de /api/enums/:nombre */
export const MOCK_CATALOGOS: Record<string, UiSelectOption[]> = {
  estadoprevision: [
    'Registrado', 'En análisis', 'Con previsión', 'Listo para impulsar',
    'Impulsado', 'Pagado', 'Acreditado', 'Cerrado',
  ].map(v => ({ value: v, label: v })),
  tipoobligacion: [
    'Sentencia', 'Regulación de honorarios', 'Acuerdo', 'Costas', 'Multa', 'Depósito de queja', 'Otro',
  ].map(v => ({ value: v, label: v })),
  conceptoprevision: [
    'Capital', 'Intereses', 'Honorarios', 'IVA', 'Costas', 'Multa', 'Art. 730', 'Depósito de queja', 'Otro',
  ].map(v => ({ value: v, label: v })),
  estadoliquidacion: [
    'Practicada', 'Impugnada', 'Con traslado', 'Aprobada / firme',
  ].map(v => ({ value: v, label: v })),
  mediopago: [
    'Transferencia', 'Cheque', 'Depósito judicial', 'Otro',
  ].map(v => ({ value: v, label: v })),
};

const BASE = {
  area: 'Civil', tipoExpediente: 'Demanda Civil Parte Demandada', fuero: 'Civil',
  fechaFirmeza: null, fechaPrevisionado: null, ejercicio: null, tasa: 'Tasa activa BNA',
  observaciones: null, obligadoDetalle: null,
  items: [], liquidaciones: [], impulsos: [], pagos: [], acreditaciones: [], intimaciones: [],
  prorrateo: null, factura: null, historial: [], marcas: [], alertas: [],
  totalLiquidacionVigente: null, totalPagado: 0, saldo: 0,
};

export const MOCK_PREVISIONES: PrevisionDetalle[] = [
  // 1. Recién creada, sin previsión registrada
  {
    ...BASE, id: 1, expedienteId: 12, expedienteNumero: 'EXP-2025-12',
    caratula: 'García, Juan c/ Empresa Constructora S.A. s/ daños y perjuicios',
    cliente: 'Empresa Constructora S.A.', tipoObligacion: 'Sentencia',
    obligado: 'CLIENTE', obligadoNombre: 'Empresa Constructora S.A.', modo: 'ACTIVO', estado: 'Registrado',
    fechaResolucion: '2026-06-10', fechaEstimadaPago: '2026-12-31',
    montoBase: 5000000, montoPrevisto: 6100000,
    items: [
      { id: 1, concepto: 'Capital', monto: 5000000 },
      { id: 2, concepto: 'Intereses', monto: 1100000 },
    ],
    historial: [{ fecha: '2026-06-15', usuario: 'Nai', accion: 'Creó la previsión', detalle: 'Monto previsto: $ 6.100.000' }],
  },
  // 2. Con previsión y liquidación con traslado → todavía no se puede impulsar
  {
    ...BASE, id: 2, expedienteId: 18, expedienteNumero: 'EXP-2024-18', area: 'Laboral',
    tipoExpediente: 'Demanda Laboral Parte Demandada', fuero: 'Laboral',
    caratula: 'López, María c/ Acme S.A. s/ despido', cliente: 'Acme S.A.', tipoObligacion: 'Sentencia',
    obligado: 'CLIENTE', obligadoNombre: 'Acme S.A.', modo: 'ACTIVO', estado: 'Con previsión',
    fechaResolucion: '2026-03-22', fechaFirmeza: '2026-04-10', fechaEstimadaPago: '2026-12-31',
    fechaPrevisionado: '2026-04-20', ejercicio: 2026,
    montoBase: 1200000, montoPrevisto: 1480000,
    items: [
      { id: 3, concepto: 'Capital', monto: 1000000 },
      { id: 4, concepto: 'Honorarios', monto: 200000, instancia: 'Primera' },
    ],
    liquidaciones: [{
      id: 1, numero: 1, fechaLiquidacion: '2026-07-01', fechaDesde: '2026-03-22', fechaHasta: '2026-07-01',
      tasa: 'Tasa activa BNA', tasaValor: 55, capital: 1200000, intereses: 180000, otros: 100000, total: 1480000,
      estadoLiquidacion: 'Con traslado', vigente: true,
    }],
    historial: [
      { fecha: '2026-04-15', usuario: 'Nai', accion: 'Creó la previsión' },
      { fecha: '2026-04-20', usuario: 'Nai', accion: 'Registró la previsión' },
      { fecha: '2026-07-01', usuario: 'Nai', accion: 'Cargó liquidación N° 1', detalle: 'Total: $ 1.480.000' },
    ],
  },
  // 3. Impulsado y con un pago parcial
  {
    ...BASE, id: 3, expedienteId: 25, expedienteNumero: 'EXP-2025-25',
    caratula: 'Pérez, Ana c/ López Hnos. S.R.L. s/ cobro', cliente: 'López Hnos. S.R.L.', tipoObligacion: 'Costas',
    obligado: 'CLIENTE', obligadoNombre: 'López Hnos. S.R.L.', modo: 'ACTIVO', estado: 'Impulsado',
    fechaResolucion: '2025-11-05', fechaFirmeza: '2025-12-01', fechaEstimadaPago: '2026-09-30',
    fechaPrevisionado: '2025-12-10',
    montoBase: 3800000, montoPrevisto: 4650000,
    items: [{ id: 5, concepto: 'Costas', monto: 3800000 }],
    liquidaciones: [{
      id: 2, numero: 1, fechaLiquidacion: '2026-08-10', fechaDesde: '2025-11-05', fechaHasta: '2026-08-10',
      tasa: 'Tasa activa BNA', tasaValor: 55, capital: 3800000, intereses: 650000, otros: 200000, total: 4650000,
      estadoLiquidacion: 'Aprobada / firme', vigente: true,
    }],
    impulsos: [{ id: 1, fecha: '2026-08-20', monto: 4650000, esDiferencia: false, documento: null }],
    pagos: [{
      id: 1, fechaPago: '2026-09-05', monto: 2300000, pagador: 'CLIENTE', pagadorDetalle: null,
      medioPago: 'Transferencia', referencia: 'TRF-00891', documento: null,
    }],
    intimaciones: [{
      id: 1, fecha: '2026-09-10', fechaVencimiento: '2026-09-24', apercibimiento: 'Ejecución',
      documento: null, tareaId: 501,
    }],
    historial: [
      { fecha: '2026-09-10', usuario: 'Nai', accion: 'Registró intimación de pago (vence 24/09/2026)' },
      { fecha: '2026-09-05', usuario: 'Nai', accion: 'Registró pago', detalle: '$ 2.300.000' },
      { fecha: '2026-08-20', usuario: 'Nai', accion: 'Registró impulso', detalle: '$ 4.650.000' },
    ],
  },
  // 4. Seguimiento: paga la aseguradora
  {
    ...BASE, id: 4, expedienteId: 31, expedienteNumero: 'EXP-2025-31',
    caratula: 'Martínez, Roberto c/ Transportes del Sur S.A. s/ daños', cliente: 'Transportes del Sur S.A.',
    tipoObligacion: 'Sentencia', obligado: 'TERCERO', obligadoDetalle: 'Nación Seguros (citada en garantía)',
    obligadoNombre: 'Nación Seguros (citada en garantía)', modo: 'SEGUIMIENTO', estado: 'Con previsión',
    fechaResolucion: '2025-04-14', fechaFirmeza: '2025-05-02', fechaEstimadaPago: '2026-12-31',
    fechaPrevisionado: '2025-05-10',
    montoBase: 2100000, montoPrevisto: 2580000,
    items: [{ id: 6, concepto: 'Capital', monto: 2100000 }],
    liquidaciones: [{
      id: 3, numero: 1, fechaLiquidacion: '2026-07-15', fechaDesde: '2025-04-14', fechaHasta: '2026-07-15',
      tasa: 'Tasa activa BNA', tasaValor: 55, capital: 2100000, intereses: 380000, otros: 100000, total: 2580000,
      estadoLiquidacion: 'Aprobada / firme', vigente: true,
    }],
  },
];

// ---------- Motor de estados simplificado (en el back: previsionEstado.service.js) ----------

function liquidacionVigente(p: PrevisionDetalle) {
  return p.liquidaciones.find(l => l.vigente) ?? null;
}

function cumpleCondicionesImpulso(p: PrevisionDetalle): boolean {
  const liq = liquidacionVigente(p);
  const tieneHonorarios = p.items.some(i => i.concepto === 'Honorarios');
  return !!liq && liq.estadoLiquidacion === 'Aprobada / firme'
    && (!tieneHonorarios || !!p.factura)
    && (!p.prorrateo?.aprobado || p.prorrateo.verificado);
}

/** Recalcula saldo, estado, marcas y alertas. Se llama después de cada acción del mock. */
export function mockRecalcular(p: PrevisionDetalle): void {
  const liq = liquidacionVigente(p);
  p.totalLiquidacionVigente = liq?.total ?? null;
  p.totalPagado = p.pagos.reduce((s, x) => s + x.monto, 0);
  p.saldo = (liq?.total ?? p.montoPrevisto) - p.totalPagado;

  if (p.estado === 'Con previsión' || p.estado === 'Listo para impulsar') {
    p.estado = p.modo === 'ACTIVO' && cumpleCondicionesImpulso(p) ? 'Listo para impulsar' : 'Con previsión';
  }

  const marcas: string[] = [];
  if (p.prorrateo?.aprobado) marcas.push('Con prorrateo art. 730 aplicado');
  if (p.pagos.some(x => x.pagador !== 'CLIENTE')) marcas.push('Pago de tercero informado');
  if (p.pagos.length && p.saldo > 0) marcas.push('Pago parcial');
  if (p.factura) marcas.push('Factura cargada');
  if (liq && liq.estadoLiquidacion !== 'Aprobada / firme') marcas.push('Liquidación no firme');
  if (p.acreditaciones.some(a => a.ordenaNotificar && !a.notificacionCumplida)) marcas.push('Notificación pendiente');
  if (p.modo === 'SEGUIMIENTO' && p.pagos.length && p.saldo > 0) marcas.push('Saldo a cargo del cliente');
  // La intimación que cuenta es la última; deja de importar cuando no queda saldo
  const intimacion = p.intimaciones[0];
  const hoy = new Date().toISOString().slice(0, 10);
  const intimacionVencida = !!intimacion && p.saldo > 0 && intimacion.fechaVencimiento < hoy;
  if (intimacion && p.saldo > 0) marcas.push(intimacionVencida ? 'Intimación vencida' : 'Intimación vigente');
  p.marcas = marcas;

  const alertas: Alerta[] = [];
  if (p.estado === 'Registrado') {
    alertas.push({ tipo: 'warning', titulo: 'Obligación sin previsión registrada', descripcion: 'Registrá la previsión para avanzar.' });
  }
  if (liq && liq.estadoLiquidacion !== 'Aprobada / firme') {
    alertas.push({ tipo: 'warning', titulo: 'Liquidación no firme', descripcion: 'No se puede impulsar hasta que la liquidación quede aprobada.' });
  }
  if (p.items.some(i => i.concepto === 'Honorarios') && !p.factura) {
    alertas.push({ tipo: 'warning', titulo: 'Factura de honorarios pendiente', descripcion: 'Para impulsar el pago de honorarios tiene que estar la factura.' });
  }
  if (p.prorrateo?.aprobado && !p.prorrateo.verificado) {
    alertas.push({ tipo: 'warning', titulo: 'Prorrateo aprobado sin verificar', descripcion: 'Verificá la resolución antes de impulsar.' });
  }
  if (p.pagos.length && p.saldo > 0) {
    alertas.push({ tipo: 'info', titulo: 'Pago parcial con saldo', descripcion: 'Queda saldo pendiente.' });
  }
  if (intimacionVencida) {
    alertas.push({
      tipo: 'warning', titulo: 'Intimación vencida sin pago',
      descripcion: `Venció el ${intimacion.fechaVencimiento.split('-').reverse().join('/')} y queda saldo. Evaluá pedir la ejecución.`,
    });
  }
  if (marcas.includes('Notificación pendiente')) {
    alertas.push({ tipo: 'info', titulo: 'Notificación pendiente', descripcion: 'El proveído ordenó notificar.' });
  }
  p.alertas = alertas;
}

export function mockAResumen(p: PrevisionDetalle): PrevisionResumen {
  const {
    id, expedienteId, expedienteNumero, caratula, cliente, tipoObligacion, obligado, obligadoNombre,
    modo, estado, fechaResolucion, montoBase, montoPrevisto, totalLiquidacionVigente, totalPagado, saldo,
  } = p;
  return {
    id, expedienteId, expedienteNumero, caratula, cliente, tipoObligacion, obligado, obligadoNombre,
    modo, estado, fechaResolucion, montoBase, montoPrevisto, totalLiquidacionVigente, totalPagado, saldo,
  };
}

MOCK_PREVISIONES.forEach(mockRecalcular);