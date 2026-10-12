/**
 * Contrato entre el front y el back del módulo Previsión y pago.
 * Es la forma del JSON que devuelve /api/previsiones (sección 5 del documento técnico).
 * Si el back cambia un nombre de campo, se cambia acá y el compilador marca dónde impacta.
 */

export type EstadoPrevision =
  | 'Registrado'
  | 'En análisis'
  | 'Con previsión'
  | 'Listo para impulsar'
  | 'Impulsado'
  | 'Pagado'
  | 'Acreditado'
  | 'Cerrado';

export type ModoPrevision = 'ACTIVO' | 'SEGUIMIENTO';

export type Obligado = 'CLIENTE' | 'CONTRAPARTE' | 'TERCERO';

export type EstadoLiquidacion = 'Practicada' | 'Impugnada' | 'Con traslado' | 'Aprobada / firme';

/** Referencia a un archivo del módulo Documentos (tabla documento). */
export interface DocumentoRef {
  id: number;
  nombre: string;
  url: string;
}

/** Fila del listado general y de la pestaña Previsión del expediente. */
export interface PrevisionResumen {
  id: number;
  expedienteId: number;
  expedienteNumero: string;          // EXP-año-id, igual que numeroInterno de expedientes
  caratula: string;
  cliente: string;
  tipoObligacion: string;
  obligado: Obligado;
  obligadoNombre: string;            // ya resuelto por el back: nombre del cliente u obligado_detalle
  modo: ModoPrevision;
  estado: EstadoPrevision;
  fechaResolucion: string | null;    // ISO yyyy-mm-dd
  montoBase: number;
  montoPrevisto: number;
  totalLiquidacionVigente: number | null;
  totalPagado: number;
  saldo: number;
}

export interface PrevisionItem {
  id?: number;
  concepto: string;
  monto: number;
  instancia?: string | null;         // solo honorarios
  observaciones?: string | null;
}

export interface Liquidacion {
  id: number;
  numero: number;
  fechaLiquidacion: string;
  fechaDesde: string;
  fechaHasta: string;
  tasa: string;
  tasaValor: number | null;
  capital: number;
  intereses: number;
  otros: number;
  total: number;
  estadoLiquidacion: EstadoLiquidacion;
  vigente: boolean;
  observaciones?: string | null;
}

export interface Impulso {
  id: number;
  fecha: string;
  monto: number;
  esDiferencia: boolean;
  documento: DocumentoRef | null;
  observaciones?: string | null;
}

export interface Pago {
  id: number;
  fechaPago: string;
  monto: number;
  pagador: Obligado;
  pagadorDetalle: string | null;
  medioPago: string;
  referencia: string | null;
  documento: DocumentoRef | null;
  observaciones?: string | null;
}

export interface Acreditacion {
  id: number;
  fecha: string;
  documento: DocumentoRef | null;
  ordenaNotificar: boolean;
  tareaId: number | null;
  notificacionCumplida: boolean;
}

/** Intimación de pago: el juzgado intima al obligado a pagar en un plazo. No cambia el estado. */
export interface Intimacion {
  id: number;
  fecha: string;                     // fecha de notificación
  fechaVencimiento: string;          // la carga el abogado (días hábiles judiciales)
  apercibimiento: string | null;     // ej. "ejecución", "embargo", "astreintes"
  documento: DocumentoRef | null;    // cédula o proveído
  tareaId: number | null;            // tarea de Agenda que vence ese día
  observaciones?: string | null;
}

export interface Prorrateo {
  aprobado: boolean;
  verificado: boolean;
  fechaAprobacion: string | null;
  resolucion: string | null;
  baseCalculo: number | null;
  honorariosSujetos: number | null;
  coeficiente: number | null;
  montoProrrateado: number | null;
}

export interface FacturaHonorarios {
  profesional: string;
  monto: number;
  fecha: string;
  documento: DocumentoRef | null;
}

export interface EventoHistorial {
  fecha: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

export interface Alerta {
  tipo: 'warning' | 'info';
  titulo: string;
  descripcion: string;
}

/** Respuesta de GET /api/previsiones/:id */
export interface PrevisionDetalle extends PrevisionResumen {
  area: string;
  tipoExpediente: string;
  fuero: string | null;
  obligadoDetalle: string | null;
  fechaFirmeza: string | null;
  fechaEstimadaPago: string | null;
  ejercicio: number | null;
  tasa: string | null;
  fechaPrevisionado: string | null;
  observaciones: string | null;
  items: PrevisionItem[];
  liquidaciones: Liquidacion[];
  impulsos: Impulso[];
  pagos: Pago[];
  acreditaciones: Acreditacion[];
  intimaciones: Intimacion[];
  prorrateo: Prorrateo | null;
  factura: FacturaHonorarios | null;
  historial: EventoHistorial[];
  marcas: string[];                  // nombres de marca, ej. 'Liquidación no firme'
  alertas: Alerta[];
}

/** Fila de la pestaña global Liquidaciones (GET /api/previsiones/liquidaciones). */
export interface LiquidacionListado extends Liquidacion {
  previsionId: number;
  expedienteNumero: string;
  cliente: string;
}

/** Fila de la pestaña global Pagos (GET /api/previsiones/pagos). */
export interface PagoListado extends Pago {
  previsionId: number;
  expedienteNumero: string;
  cliente: string;
}

export interface PrevisionFiltros {
  expediente?: string;
  cliente?: string;
  estado?: string;
  tipoObligacion?: string;
  modo?: string;
  expedienteId?: number;
}

/** Body de POST /api/previsiones */
export interface NuevaPrevision {
  expedienteId: number;
  tipoObligacion: string;
  obligado: Obligado;
  obligadoDetalle: string | null;
  modo: ModoPrevision;
  fechaResolucion: string | null;
  fechaFirmeza: string | null;
  fechaEstimadaPago: string | null;
  ejercicio: number | null;
  montoBase: number;
  tasa: string | null;
  observaciones: string | null;
  items: PrevisionItem[];
}

/** Body y respuesta de POST /api/previsiones/calcular */
export interface CalculoRequest {
  montoBase: number;
  tasa: string;
  fechaDesde: string;
  fechaHasta: string;
  otros?: number;
}

export interface CalculoResultado {
  capital: number;
  intereses: number;
  otros: number;
  total: number;
  tasaValor: number | null;
  tasaFechaPublicacion: string | null;
  dias: number;
  metodologia: string;
}