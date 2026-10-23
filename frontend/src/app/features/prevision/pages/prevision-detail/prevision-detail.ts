import { Component, signal, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { UiSelect, UiSelectOption } from '../../../../shared/components/ui-select/ui-select';
import { UiBadge } from '../../../../shared/components/ui-badge/ui-badge';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';
import { ModalLiquidacion } from '../../components/modal-liquidacion/modal-liquidacion';
import { ModalPago } from '../../components/modal-pago/modal-pago';
import { ModalVerComprobante } from '../../components/modal-ver-comprobante/modal-ver-comprobante';
import { ModalAccionPrevision, TipoAccion } from '../../components/modal-accion-prevision/modal-accion-prevision';
import { PrevisionService } from '../../services/prevision.service';
import {
  Acreditacion, DocumentoRef, EstadoLiquidacion, EstadoPrevision, Intimacion, Liquidacion, Pago, PrevisionDetalle, Prorrateo,
} from '../../models/prevision.model';
import {
  ACCIONES, BADGE_ESTADO, BADGE_LIQUIDACION, BADGE_MODO, MARCA_CLASES, MARCA_CLASE_DEFAULT, OBLIGADO_LABEL,
  formatCoeficiente, formatFecha, formatMonto, hoyISO,
} from '../../models/prevision.constants';

/** Texto de ayuda: qué falta para avanzar en cada estado. */
const PROXIMO_PASO: Record<EstadoPrevision, string> = {
  'Registrado':          'Cuando el cliente reserve el monto en su presupuesto, usá "Registrar previsión".',
  'En análisis':         'Cuando el cliente reserve el monto en su presupuesto, usá "Registrar previsión".',
  'Con previsión':       'Para impulsar falta: liquidación aprobada / firme y, si hay honorarios, la factura.',
  'Listo para impulsar': 'Pedile los fondos a la Administración del cliente con "Registrar solicitud de pago".',
  'Impulsado':           'Cuando se deposite, registrá el pago.',
  'Pagado':              'Cuando el juzgado tenga por acreditado el pago, registrá la acreditación.',
  'Acreditado':          'Si no hay notificación pendiente, cerrá la previsión.',
  'Cerrado':             'Previsión cerrada. Solo lectura.',
};

@Component({
  selector: 'app-prevision-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PrimaryBtn, UiTable, UiInput, UiDateInput, UiSelect, UiBadge, UiModal, UiConfirmModal,
    ModalLiquidacion, ModalPago, ModalVerComprobante, ModalAccionPrevision,
  ],
  templateUrl: './prevision-detail.html',
})
export class PrevisionDetail implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private previsionService = inject(PrevisionService);
  private cdr = inject(ChangeDetectorRef);

  tab = signal<'resumen' | 'liquidaciones' | 'pagos' | 'historial'>('resumen');

  /** Lo que devuelve GET /api/previsiones/:id: datos + estado + marcas + alertas, todo calculado por el back. */
  prevision: PrevisionDetalle | null = null;
  cargando = true;

  // Filas ya formateadas para las tablas (se arman una vez por respuesta)
  filasItems: any[] = [];
  filasLiquidaciones: any[] = [];

  estadoLiquidacionOptions: UiSelectOption[] = [];

  // Modales
  modalLiquidacionOpen = false;
  modalPagoOpen = false;
  modalAccionOpen = false;
  tipoAccion: TipoAccion = 'registrar';
  confirmarCierreOpen = false;
  cerrando = false;
  modalComprobanteOpen = false;
  comprobanteAVer: { nombre: string; url: string } | null = null;

  // Anulación de un pago o una liquidación cargados por error (con confirmación)
  aAnular: { tipo: 'pago' | 'liquidacion'; id: number; descripcion: string } | null = null;
  anulando = false;

  // Prorrateo (edición en línea)
  editandoProrrateo = false;
  guardandoProrrateo = false;
  formProrrateo = this.prorrateoAForm(null);

  readonly BADGE_ESTADO = BADGE_ESTADO;
  readonly BADGE_MODO = BADGE_MODO;
  readonly BADGE_LIQUIDACION = BADGE_LIQUIDACION;
  readonly OBLIGADO_LABEL = OBLIGADO_LABEL;
  readonly PROXIMO_PASO = PROXIMO_PASO;
  formatMonto = formatMonto;
  formatFecha = formatFecha;
  formatCoeficiente = formatCoeficiente;

  columnsItems: TableColumn[] = [
    { key: 'concepto',      label: 'Concepto',      type: 'text' },
    { key: 'monto',         label: 'Monto',         type: 'text' },
    { key: 'instancia',     label: 'Instancia',     type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ];

  columnsLiquidaciones: TableColumn[] = [
    { key: 'numero',            label: 'N°',              type: 'text' },
    { key: 'fecha',             label: 'Fecha',           type: 'text' },
    { key: 'periodo',           label: 'Período',         type: 'text' },
    { key: 'capital',           label: 'Capital',         type: 'text' },
    { key: 'intereses',         label: 'Intereses',       type: 'text' },
    { key: 'otros',             label: 'Otros',           type: 'text' },
    { key: 'total',             label: 'Total',           type: 'text' },
    { key: 'estadoLiquidacion', label: 'Estado procesal', type: 'badge', badgeConfig: BADGE_LIQUIDACION },
    { key: 'vigencia',          label: 'Vigencia',        type: 'badge',
      badgeConfig: {
        'Vigente':     { label: 'Vigente',     classes: 'bg-success/10 text-success', dot: 'bg-success' },
        'Reemplazada': { label: 'Reemplazada', classes: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300', dot: 'bg-gray-400' },
      },
    },
    { key: 'acciones',          label: 'Acciones',        type: 'actions',
      getActions: () => (this.puede('anularMovimiento') ? ['delete'] : []) },
  ];

  ngOnInit(): void {
    this.previsionService.obtenerCatalogo('estadoliquidacion').subscribe(o => (this.estadoLiquidacionOptions = o));
    this.cargar();
  }

  cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargando = true;
    this.previsionService.obtener(id).subscribe({
      next: (p) => this.actualizar(p),
      error: (err) => {
        toast.error(err?.error?.mensaje ?? 'No se pudo cargar la previsión');
        this.volver();
      },
    });
  }

  /** Toda acción devuelve la previsión actualizada: se reemplaza entera (estado, marcas y alertas incluidas). */
  actualizar(p: PrevisionDetalle): void {
    this.prevision = p;
    this.cargando = false;
    this.filasItems = p.items.map(i => ({
      concepto: i.concepto,
      monto: formatMonto(i.monto),
      instancia: i.instancia ?? '—',
      observaciones: i.observaciones ?? '—',
    }));
    this.filasLiquidaciones = p.liquidaciones.map(l => ({
      id: l.id,
      numero: l.numero,
      fecha: formatFecha(l.fechaLiquidacion),
      periodo: `${formatFecha(l.fechaDesde)} – ${formatFecha(l.fechaHasta)}`,
      capital: formatMonto(l.capital),
      intereses: formatMonto(l.intereses),
      otros: formatMonto(l.otros),
      total: formatMonto(l.total),
      estadoLiquidacion: l.estadoLiquidacion,
      vigencia: l.vigente ? 'Vigente' : 'Reemplazada',
    }));
    this.cdr.detectChanges();
  }

  // ---------- Getters de pantalla ----------

  /** Qué botones se muestran. El back igual valida y responde 409 si no corresponde. */
  puede(accion: keyof typeof ACCIONES): boolean {
    return !!this.prevision && ACCIONES[accion](this.prevision);
  }

  get tieneHonorarios(): boolean {
    return !!this.prevision?.items.some(i => i.concepto === 'Honorarios');
  }

  get liquidacionVigente(): Liquidacion | null {
    return this.prevision?.liquidaciones.find(l => l.vigente) ?? null;
  }

  get notificacionPendiente(): Acreditacion | null {
    return this.prevision?.acreditaciones.find(a => a.ordenaNotificar && !a.notificacionCumplida) ?? null;
  }

  /** Vencida = pasó la fecha y todavía queda saldo. Si ya se pagó, la intimación dejó de importar. */
  intimacionVencida(i: Intimacion): boolean {
    return (this.prevision?.saldo ?? 0) > 0 && i.fechaVencimiento < hoyISO();
  }

  claseMarca(marca: string): string {
    return MARCA_CLASES[marca] ?? MARCA_CLASE_DEFAULT;
  }

  // ---------- Acciones del flujo ----------

  abrirAccion(tipo: TipoAccion): void {
    this.tipoAccion = tipo;
    this.modalAccionOpen = true;
  }

  cerrarPrevision(): void {
    if (!this.prevision) return;
    this.cerrando = true;
    this.previsionService.cerrar(this.prevision.id).subscribe({
      next: (p) => {
        this.cerrando = false;
        this.confirmarCierreOpen = false;
        toast.success('Previsión cerrada');
        this.actualizar(p);
      },
      error: (err) => {
        this.cerrando = false;
        this.confirmarCierreOpen = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo cerrar');
      },
    });
  }

  cambiarModo(): void {
    if (!this.prevision) return;
    const nuevo = this.prevision.modo === 'ACTIVO' ? 'SEGUIMIENTO' : 'ACTIVO';
    this.previsionService.cambiarModo(this.prevision.id, nuevo).subscribe({
      next: (p) => this.actualizar(p),
      error: (err) => toast.error(err?.error?.mensaje ?? 'No se pudo cambiar el modo'),
    });
  }

  onEstadoLiquidacionChange(estado: EstadoLiquidacion): void {
    const liq = this.liquidacionVigente;
    if (!this.prevision || !liq || liq.estadoLiquidacion === estado) return;
    this.previsionService.cambiarEstadoLiquidacion(this.prevision.id, liq.id, estado).subscribe({
      next: (p) => this.actualizar(p),
      error: (err) => toast.error(err?.error?.mensaje ?? 'No se pudo cambiar el estado de la liquidación'),
    });
  }

  /**
   * La descarga de Documentos exige el token, y un <img> o <iframe> no lo envía:
   * se trae el archivo con HttpClient (pasa por el interceptor) y se muestra desde una URL local.
   */
  // ---------- Anular pago o liquidación ----------

  /** Acción "delete" de la tabla de liquidaciones. */
  onAccionLiquidacion(event: { type: string; row: any }): void {
    if (event.type !== 'delete') return;
    this.aAnular = {
      tipo: 'liquidacion',
      id: event.row.id,
      descripcion: `la liquidación N° ${event.row.numero} (${event.row.total})`,
    };
  }

  pedirAnularPago(pago: Pago): void {
    this.aAnular = {
      tipo: 'pago',
      id: pago.id,
      descripcion: `el pago de ${formatMonto(pago.monto)} del ${formatFecha(pago.fechaPago)}`,
    };
  }

  get mensajeAnulacion(): string {
    if (!this.aAnular) return '';
    return `Vas a anular ${this.aAnular.descripcion}. No se borra: queda registrado en el historial ` +
      `y el saldo y el estado se recalculan.`;
  }

  confirmarAnulacion(): void {
    const p = this.prevision;
    const a = this.aAnular;
    if (!p || !a || this.anulando) return;
    this.anulando = true;
    const llamada = a.tipo === 'pago'
      ? this.previsionService.anularPago(p.id, a.id)
      : this.previsionService.anularLiquidacion(p.id, a.id);
    llamada.subscribe({
      next: (actualizada) => {
        this.anulando = false;
        this.aAnular = null;
        toast.success(a.tipo === 'pago' ? 'Pago anulado' : 'Liquidación anulada');
        this.actualizar(actualizada);
      },
      error: (err) => {
        this.anulando = false;
        this.aAnular = null;
        toast.error(err?.error?.mensaje ?? 'No se pudo anular');
        this.cdr.detectChanges();
      },
    });
  }

  verDocumento(doc: DocumentoRef | null): void {
    if (!doc) return;
    this.previsionService.descargarDocumento(doc).subscribe({
      next: (archivo) => {
        this.comprobanteAVer = archivo;
        this.modalComprobanteOpen = true;
        this.cdr.detectChanges();
      },
      error: () => toast.error('No se pudo abrir el documento'),
    });
  }

  cerrarComprobante(): void {
    if (this.comprobanteAVer) URL.revokeObjectURL(this.comprobanteAVer.url);
    this.comprobanteAVer = null;
    this.modalComprobanteOpen = false;
  }

  // ---------- Prorrateo art. 730 ----------

  editarProrrateo(): void {
    this.formProrrateo = this.prorrateoAForm(this.prevision?.prorrateo ?? null);
    this.editandoProrrateo = true;
  }

  guardarProrrateo(): void {
    if (!this.prevision) return;
    const f = this.formProrrateo;
    const datos: Prorrateo = {
      aprobado: f.aprobado,
      verificado: true, // guardar = el abogado verificó la resolución
      fechaAprobacion: f.fechaAprobacion || null,
      resolucion: f.resolucion || null,
      baseCalculo: this.parseMontoONull(f.baseCalculo),
      honorariosSujetos: this.parseMontoONull(f.honorariosSujetos),
      coeficiente: f.coeficiente ? Number(f.coeficiente.replace(',', '.')) : null,
      montoProrrateado: this.parseMontoONull(f.montoProrrateado),
    };
    this.guardandoProrrateo = true;
    this.previsionService.guardarProrrateo(this.prevision.id, datos).subscribe({
      next: (p) => {
        this.guardandoProrrateo = false;
        this.editandoProrrateo = false;
        this.actualizar(p);
      },
      error: (err) => {
        this.guardandoProrrateo = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo guardar el prorrateo');
      },
    });
  }

  private prorrateoAForm(p: Prorrateo | null) {
    const txt = (n: number | null | undefined) => (n === null || n === undefined ? '' : n.toLocaleString('es-AR'));
    return {
      aprobado: p?.aprobado ?? false,
      fechaAprobacion: p?.fechaAprobacion ?? '',
      resolucion: p?.resolucion ?? '',
      baseCalculo: txt(p?.baseCalculo),
      honorariosSujetos: txt(p?.honorariosSujetos),
      coeficiente: p?.coeficiente === null || p?.coeficiente === undefined ? '' : String(p.coeficiente).replace('.', ','),
      montoProrrateado: txt(p?.montoProrrateado),
    };
  }

  // ---------- Helpers ----------

  /** "$ 5.000.000,50" → 5000000.5 */
  private parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = String(valor).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }

  private parseMontoONull(valor: string): number | null {
    return valor ? this.parseMonto(valor) : null;
  }

  volver(): void {
    this.router.navigate(['/prevision-y-pago']);
  }
}