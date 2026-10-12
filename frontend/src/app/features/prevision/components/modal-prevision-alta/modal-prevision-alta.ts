import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect, UiSelectOption } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ExpedientesService } from '../../../gestion-expedientes/services/expedientes.service';
import { PrevisionService } from '../../services/prevision.service';
import { CalculoResultado, ModoPrevision, NuevaPrevision, Obligado, PrevisionDetalle } from '../../models/prevision.model';
import { MODO_OPTIONS, OBLIGADO_OPTIONS, formatMonto, modoPorObligado } from '../../models/prevision.constants';
import { TASAS_CONFIG } from '../../models/tasas-config';

/** Lo que el modal necesita del expediente (sale de GET /api/expedientes y /api/expedientes/:id). */
interface ExpedienteCtx {
  id: number;
  numero: string;
  caratula: string;
  area: string;
  tipo: string;
  estado: string;
  cliente: string;
  contraparte: string;
  habilitaPrevision: boolean;
  /** Si es parte de una causa y no es el principal: número del principal (ahí se carga la previsión). */
  principalNumero: string | null;
}

interface ItemForm {
  concepto: string;
  monto: string;
  instancia: string;
  observaciones: string;
}

const TASA_DEFAULT = 'Tasa Activa Cartera general (préstamos) nominal anual vencida a 30 días del Banco Nación';

@Component({
  selector: 'app-modal-prevision-alta-global',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-prevision-alta.html',
})
export class ModalPrevisionAltaGlobal implements OnChanges {
  @Input() open = false;
  /** Si viene (desde la pestaña Previsión del expediente), se saltea la búsqueda. */
  @Input() expedienteId: number | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<PrevisionDetalle>();

  private expedientesService = inject(ExpedientesService);
  private previsionService = inject(PrevisionService);
  private cdr = inject(ChangeDetectorRef);

  paso: 1 | 2 = 1;
  guardando = false;
  calculando = false;
  buscando = false;

  // ---------- Paso 1: búsqueda ----------
  busqueda = '';
  resultados: ExpedienteCtx[] = [];
  expedienteSeleccionado: ExpedienteCtx | null = null;

  // ---------- Paso 2: datos ----------
  /** Expediente completo (con contraparte), cargado con GET /api/expedientes/:id. */
  expediente: ExpedienteCtx | null = null;

  tipoObligacionOptions: UiSelectOption[] = [];
  conceptoOptions: UiSelectOption[] = [];
  obligadoOptions = OBLIGADO_OPTIONS;
  modoOptions = MODO_OPTIONS;
  tasaOptions: UiSelectOption[] = TASAS_CONFIG
    .filter(t => t.grupo !== 'CALCULADORA')
    .map(t => ({ value: t.nombre, label: t.nombre }));
  instanciaOptions: UiSelectOption[] = ['Única', 'Primera', 'Segunda', 'Tercera'].map(v => ({ value: v, label: v }));

  form = this.formVacio();
  items: ItemForm[] = [this.itemVacio()];
  calculo: CalculoResultado | null = null;

  formatMonto = formatMonto;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.iniciar();
  }

  private iniciar(): void {
    if (!this.tipoObligacionOptions.length) {
      this.previsionService.obtenerCatalogo('tipoobligacion').subscribe(o => (this.tipoObligacionOptions = o));
      this.previsionService.obtenerCatalogo('conceptoprevision').subscribe(o => (this.conceptoOptions = o));
    }
    this.resetear();
    if (this.expedienteId) {
      this.cargarExpediente(this.expedienteId);
    } else {
      this.paso = 1;
      this.buscar();
    }
  }

  // ---------- Paso 1 ----------

  /** Busca por número (EXP-2026-29 o solo 29) o por carátula, con el mismo endpoint del listado de expedientes. */
  buscar(): void {
    const q = this.busqueda.trim();
    const filtros = /^(exp-?)?[\d-]+$/i.test(q) ? { numero: q } : { caratula: q };
    this.buscando = true;
    this.expedientesService.listar({ ...filtros, pageSize: 10 }).subscribe({
      next: (res) => {
        this.resultados = (res.data ?? []).map((e: any) => this.mapExpediente(e));
        this.buscando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscando = false;
        toast.error('No se pudieron buscar expedientes');
      },
    });
  }

  seleccionarExpediente(exp: ExpedienteCtx): void {
    if (!exp.habilitaPrevision) return;
    this.expedienteSeleccionado = exp;
  }

  continuarAlPaso2(): void {
    if (this.expedienteSeleccionado) this.cargarExpediente(this.expedienteSeleccionado.id);
  }

  volverAlPaso1(): void {
    this.paso = 1;
    this.expediente = null;
  }

  /** Trae el expediente completo: el listado no devuelve la contraparte. */
  private cargarExpediente(id: number): void {
    this.expedientesService.obtener(id).subscribe({
      next: (e) => {
        const exp = this.mapExpediente(e);
        if (exp.principalNumero) {
          toast.error(`Este expediente es parte de una causa: la previsión se registra en el principal N° ${exp.principalNumero}`);
          return;
        }
        if (!exp.habilitaPrevision) {
          toast.error('El expediente no está en un estado que permita registrar una previsión');
          return;
        }
        this.expediente = exp;
        // Acuerdo extrajudicial: paga el deudor → arranca en Contraparte. El resto arranca en Cliente.
        this.onObligadoChange(exp.estado.toUpperCase().includes('ACUERDO') ? 'CONTRAPARTE' : 'CLIENTE');
        this.paso = 2;
        this.cdr.detectChanges();
      },
      error: () => toast.error('No se pudo cargar el expediente'),
    });
  }

  private mapExpediente(e: any): ExpedienteCtx {
    return {
      id: e.id,
      numero: e.numeroInterno, // EXP-año-id, igual que en Gestión de expedientes
      caratula: e.caratula ?? '',
      area: e.area ?? '',
      tipo: e.tipo?.nombre ?? '',
      estado: e.estado?.nombre ?? '',
      cliente: e.cliente?.nombre ?? '—',
      contraparte: e.contraparte ?? '',
      // 🔴 Hasta que el back devuelva habilitaPrevision (sale de tipoestadoexpediente), se asume true
      habilitaPrevision: e.habilitaPrevision ?? true,
      principalNumero: e.causa?.expedientePrincipalId && e.causa.expedientePrincipalId !== e.id
        ? (e.causa.principalNumero ?? String(e.causa.expedientePrincipalId))
        : null,
    };
  }

  // ---------- Obligado ----------

  /** Regla del obligado: define el nombre precargado y el modo por defecto. */
  onObligadoChange(obligado: Obligado): void {
    this.form.obligado = obligado;
    this.form.modo = modoPorObligado(obligado);
    this.form.obligadoDetalle = obligado === 'CONTRAPARTE' ? (this.expediente?.contraparte ?? '') : '';
  }

  get placeholderObligado(): string {
    return this.form.obligado === 'CONTRAPARTE'
      ? 'Nombre de la contraparte condenada'
      : 'Ej.: Nación Seguros (citada en garantía)';
  }

  get ayudaObligado(): string {
    if (this.form.obligado === 'CLIENTE') return 'Sale del cliente del expediente.';
    if (this.form.obligado === 'CONTRAPARTE') {
      return 'Precargado con la contraparte del expediente. Si hay varias, dejá solo la condenada.';
    }
    return 'No está en el sistema: escribilo tal como figura en la sentencia.';
  }

  // ---------- Ítems ----------

  agregarItem(): void {
    this.items = [...this.items, this.itemVacio()];
  }

  eliminarItem(i: number): void {
    this.items = this.items.filter((_, idx) => idx !== i);
  }

  get totalItems(): number {
    return this.items.reduce((s, i) => s + this.parseMonto(i.monto), 0);
  }

  // ---------- Cálculo ----------

  /** Proyecta el monto base hasta la fecha estimada de pago con la tasa elegida (POST /calcular). */
  calcular(): void {
    const montoBase = this.parseMonto(this.form.montoBase);
    if (!montoBase) { toast.error('Ingresá el monto base'); return; }
    if (!this.form.fechaResolucion || !this.form.fechaEstimadaPago) {
      toast.error('Completá la fecha de resolución y la fecha estimada de pago');
      return;
    }
    if (!this.form.tasa) { toast.error('Elegí una tasa'); return; }

    this.calculando = true;
    this.previsionService.calcular({
      montoBase,
      tasa: this.form.tasa,
      fechaDesde: this.form.fechaResolucion,
      fechaHasta: this.form.fechaEstimadaPago,
    }).subscribe({
      next: (r) => {
        this.calculo = r;
        this.calculando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.calculando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo calcular');
      },
    });
  }

  // ---------- Guardar ----------

  guardar(): void {
    if (!this.expediente) { toast.error('Seleccioná un expediente'); return; }
    const montoBase = this.parseMonto(this.form.montoBase);
    if (!this.form.tipoObligacion || !montoBase) {
      toast.error('Completá el tipo de obligación y el monto base');
      return;
    }
    if (this.form.obligado !== 'CLIENTE' && !this.form.obligadoDetalle.trim()) {
      toast.error('Indicá el nombre del obligado');
      return;
    }
    const itemsValidos = this.items.filter(i => i.concepto && this.parseMonto(i.monto) > 0);
    if (!itemsValidos.length) {
      toast.error('Cargá al menos un ítem con concepto y monto');
      return;
    }

    const body: NuevaPrevision = {
      expedienteId: this.expediente.id,
      tipoObligacion: this.form.tipoObligacion,
      obligado: this.form.obligado,
      obligadoDetalle: this.form.obligado === 'CLIENTE' ? null : this.form.obligadoDetalle.trim(),
      modo: this.form.modo,
      fechaResolucion: this.form.fechaResolucion || null,
      fechaFirmeza: this.form.fechaFirmeza || null,
      fechaEstimadaPago: this.form.fechaEstimadaPago || null,
      ejercicio: this.form.ejercicio ? Number(this.form.ejercicio) : null,
      montoBase,
      tasa: this.form.tasa || null,
      observaciones: this.form.observaciones || null,
      items: itemsValidos.map(i => ({
        concepto: i.concepto,
        monto: this.parseMonto(i.monto),
        instancia: i.concepto === 'Honorarios' ? i.instancia || null : null,
        observaciones: i.observaciones || null,
      })),
    };

    this.guardando = true;
    this.previsionService.crear(body).subscribe({
      next: (prevision) => {
        this.guardando = false;
        toast.success('Previsión creada');
        this.guardado.emit(prevision);
        this.cerrarModal();
      },
      error: (err) => {
        this.guardando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo crear la previsión');
      },
    });
  }

  cerrarModal(): void {
    this.resetear();
    this.cerrar.emit();
  }

  // ---------- Helpers ----------

  private resetear(): void {
    this.paso = 1;
    this.busqueda = '';
    this.resultados = [];
    this.expedienteSeleccionado = null;
    this.expediente = null;
    this.form = this.formVacio();
    this.items = [this.itemVacio()];
    this.calculo = null;
  }

  private formVacio() {
    return {
      tipoObligacion: '',
      obligado: 'CLIENTE' as Obligado,
      obligadoDetalle: '',
      modo: 'ACTIVO' as ModoPrevision,
      fechaResolucion: '',
      fechaFirmeza: '',
      fechaEstimadaPago: `${new Date().getFullYear()}-12-31`,
      ejercicio: '',
      montoBase: '',
      tasa: TASA_DEFAULT,
      observaciones: '',
    };
  }

  private itemVacio(): ItemForm {
    return { concepto: '', monto: '', instancia: '', observaciones: '' };
  }

  /** "$ 5.000.000,50" → 5000000.5 */
  private parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = String(valor).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
}