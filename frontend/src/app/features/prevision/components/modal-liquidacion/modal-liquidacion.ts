import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiSelect, UiSelectOption } from '../../../../shared/components/ui-select/ui-select';
import { toast } from 'ngx-sonner';
import { TASAS_CONFIG, getTasaConfig, GrupoTasa } from '../../models/tasas-config';
import { PrevisionService } from '../../services/prevision.service';
import { EstadoLiquidacion, PrevisionDetalle, TasaVigente } from '../../models/prevision.model';
import { formatFecha, formatMonto, hoyISO } from '../../models/prevision.constants';

interface Tramo {
  id: string;
  desde: string;
  hasta: string;
  tasa: string;
  resultado: string;
}

@Component({
  selector: 'app-modal-liquidacion',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiDateInput, PrimaryBtn, UiSelect],
  templateUrl: './modal-liquidacion.html',
})
export class ModalLiquidacion implements OnChanges {
  @Input() open = false;
  @Input() prevision: PrevisionDetalle | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<PrevisionDetalle>();

  private previsionService = inject(PrevisionService);
  private cdr = inject(ChangeDetectorRef);

  guardando = false;
  consultandoTasa = false;

  form = this.formVacio();

  // Catálogo real de tasas (viene de tasas-config.ts, con los mismos nombres que la tabla tasa)
  tipoTasaOptions = TASAS_CONFIG.map(t => ({ value: t.nombre, label: t.nombre }));
  estadoLiquidacionOptions: UiSelectOption[] = [];

  /** Último valor publicado de la tasa elegida: referencia que se guarda en la liquidación. */
  tasaVigente: TasaVigente | null = null;

  formatMonto = formatMonto;
  formatFecha = formatFecha;

  get grupoTasaSeleccionada(): GrupoTasa | null {
    const cfg = getTasaConfig(this.form.tipoTasa);
    return cfg?.grupo ?? null;
  }

  // Calculadoras propias (Grupo C): el CPACF no publica un valor de tasa
  esCalculadoraPropia(): boolean {
    return this.grupoTasaSeleccionada === 'CALCULADORA';
  }

  /** Total = capital + intereses + otros. Es una suma; el back la vuelve a verificar al guardar. */
  get total(): number {
    const centavos = [this.form.capital, this.form.intereses, this.form.otros]
      .reduce((s, v) => s + Math.round(this.parseMonto(v) * 100), 0);
    return centavos / 100;
  }

  tramos: Tramo[] = [
    { id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }
  ];

  agregarTramo(): void {
    this.tramos = [...this.tramos, { id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }];
  }

  eliminarTramo(id: string): void {
    if (this.tramos.length === 1) return;
    this.tramos = this.tramos.filter(t => t.id !== id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.precargar();
  }

  /** Arranca con los datos de la previsión: capital = monto base, desde la resolución hasta hoy, misma tasa. */
  private precargar(): void {
    if (!this.estadoLiquidacionOptions.length) {
      this.previsionService.obtenerCatalogo('estadoliquidacion').subscribe(o => (this.estadoLiquidacionOptions = o));
    }
    this.form = this.formVacio();
    this.tasaVigente = null;
    const p = this.prevision;
    if (!p) return;
    this.form.capital = p.montoBase.toLocaleString('es-AR');
    this.form.fechaDesde = p.fechaResolucion ?? '';
    this.form.tipoTasa = p.tasa ?? '';
  }

  /** Si se cambia la tasa, la referencia traída deja de corresponder. */
  onTasaChange(tasa: string): void {
    this.form.tipoTasa = tasa;
    this.tasaVigente = null;
  }

  /** Trae el último valor publicado de la tasa en el CPACF. No calcula intereses: es una referencia. */
  traerTasaVigente(): void {
    if (!this.form.tipoTasa) { toast.error('Seleccioná una tasa'); return; }
    if (this.esCalculadoraPropia()) {
      toast.error('Esta opción del CPACF es una calculadora y no publica un valor de tasa. Ingresá los montos a mano.');
      return;
    }
    this.consultandoTasa = true;
    this.previsionService.obtenerTasaVigente(this.form.tipoTasa).subscribe({
      next: (t) => {
        this.consultandoTasa = false;
        this.tasaVigente = t;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.consultandoTasa = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo consultar la tasa en el CPACF');
        this.cdr.detectChanges();
      },
    });
  }

  guardar() {
    const p = this.prevision;
    if (!p) return;
    if (!this.form.fechaLiquidacion || !this.form.estadoLiquidacion) {
      toast.error('Completá la fecha y el estado procesal');
      return;
    }
    if (!this.form.tipoTasa) { toast.error('Seleccioná una tasa'); return; }
    if (!this.form.fechaDesde || !this.form.fechaHasta) { toast.error('Completá fecha desde y hasta'); return; }
    if (this.form.fechaDesde > this.form.fechaHasta) { toast.error('La fecha desde no puede ser posterior a la fecha hasta'); return; }
    if (!this.form.capital) { toast.error('Ingresá el capital'); return; }

    const referencia = this.tasaVigente?.nombre === this.form.tipoTasa ? this.tasaVigente : null;
    this.guardando = true;
    this.previsionService.crearLiquidacion(p.id, {
      fechaLiquidacion: this.form.fechaLiquidacion,
      fechaDesde: this.form.fechaDesde,
      fechaHasta: this.form.fechaHasta,
      tasa: this.form.tipoTasa,
      tasaValor: referencia?.valor ?? null,
      tasaFechaPublicacion: referencia?.fechaPublicacion ?? null,
      capital: this.parseMonto(this.form.capital),
      intereses: this.parseMonto(this.form.intereses),
      otros: this.parseMonto(this.form.otros),
      total: this.total,
      estadoLiquidacion: this.form.estadoLiquidacion as EstadoLiquidacion,
      observaciones: this.form.observaciones || undefined,
    }).subscribe({
      next: (actualizada) => {
        this.guardando = false;
        toast.success('Liquidación guardada correctamente');
        this.tramos = [{ id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }];
        this.guardado.emit(actualizada);
        this.cerrar.emit();
      },
      error: (err) => {
        this.guardando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo guardar la liquidación');
      },
    });
  }

  private formVacio() {
    const hoy = hoyISO();
    return {
      fechaLiquidacion: hoy,
      fechaDesde: '',
      fechaHasta: hoy,
      capital: '',
      intereses: '',
      otros: '',
      tipoTasa: '',
      estadoLiquidacion: 'Practicada',
      observaciones: '',
    };
  }

  /** "$ 5.000.000,50" → 5000000.5 */
  protected parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = String(valor).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
}
