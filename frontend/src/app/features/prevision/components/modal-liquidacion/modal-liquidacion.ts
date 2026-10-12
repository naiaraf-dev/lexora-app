import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
import { CalculoResultado, EstadoLiquidacion, PrevisionDetalle } from '../../models/prevision.model';
import { formatFecha, formatMonto } from '../../models/prevision.constants';

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

  guardando = false;
  calculando = false;

  form = this.formVacio();

  // Catálogo real de tasas (viene de tasas-config.ts, que refleja lo que el back puede consultar en CPACF)
  tipoTasaOptions = TASAS_CONFIG.map(t => ({ value: t.nombre, label: t.nombre }));
  estadoLiquidacionOptions: UiSelectOption[] = [];

  /** Vista previa del back. Al guardar, el back vuelve a calcular con los mismos datos. */
  calculo: CalculoResultado | null = null;

  formatMonto = formatMonto;
  formatFecha = formatFecha;

  get grupoTasaSeleccionada(): GrupoTasa | null {
    const cfg = getTasaConfig(this.form.tipoTasa);
    return cfg?.grupo ?? null;
  }

  // Ítems calculadora propia (Grupo C) — placeholder, no se calcula por scraping
  esCalculadoraPropia(): boolean {
    return this.grupoTasaSeleccionada === 'CALCULADORA';
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

  /** Arranca con los datos de la previsión: mismo monto base, desde la resolución hasta hoy, misma tasa. */
  private precargar(): void {
    if (!this.estadoLiquidacionOptions.length) {
      this.previsionService.obtenerCatalogo('estadoliquidacion').subscribe(o => (this.estadoLiquidacionOptions = o));
    }
    this.form = this.formVacio();
    this.calculo = null;
    const p = this.prevision;
    if (!p) return;
    this.form.montoBase = p.montoBase.toLocaleString('es-AR');
    this.form.fechaDesde = p.fechaResolucion ?? '';
    this.form.tipoTasa = p.tasa ?? '';
  }

  calcular() {
    if (!this.form.tipoTasa) { toast.error('Seleccioná una tasa'); return; }
    const montoBase = this.parseMonto(this.form.montoBase);
    if (!montoBase) { toast.error('Ingresá el monto base'); return; }
    if (!this.form.fechaDesde || !this.form.fechaHasta) { toast.error('Completá fecha desde y hasta'); return; }
    if (this.esCalculadoraPropia()) {
      toast.error('Esta tasa requiere una calculadora especial — todavía no está implementada en el sistema');
      return;
    }

    this.calculando = true;
    this.previsionService.calcular({
      montoBase,
      tasa: this.form.tipoTasa,
      fechaDesde: this.form.fechaDesde,
      fechaHasta: this.form.fechaHasta,
      otros: this.parseMonto(this.form.otrosConceptos),
    }).subscribe({
      next: (r) => {
        this.calculando = false;
        this.calculo = r;
        toast.success('Cálculo generado');
      },
      error: (err) => {
        this.calculando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo consultar la tasa en el CPACF');
      },
    });
  }

  guardar() {
    const p = this.prevision;
    if (!p) return;
    if (!this.calculo) { toast.error('Calculá la liquidación antes de guardar'); return; }
    if (!this.form.fechaLiquidacion || !this.form.estadoLiquidacion) {
      toast.error('Completá la fecha y el estado procesal');
      return;
    }

    this.guardando = true;
    this.previsionService.crearLiquidacion(p.id, {
      montoBase: this.parseMonto(this.form.montoBase),
      tasa: this.form.tipoTasa,
      fechaDesde: this.form.fechaDesde,
      fechaHasta: this.form.fechaHasta,
      otros: this.parseMonto(this.form.otrosConceptos),
      fechaLiquidacion: this.form.fechaLiquidacion,
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
    const hoy = new Date().toISOString().slice(0, 10);
    return {
      fechaLiquidacion: hoy,
      fechaDesde: '',
      fechaHasta: hoy,
      montoBase: '',
      tipoTasa: '',
      otrosConceptos: '',
      estadoLiquidacion: 'Practicada',
      observaciones: '',
    };
  }

  private parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = String(valor).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
}