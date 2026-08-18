import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { toast } from 'ngx-sonner';

interface Tramo {
  id: string;
  desde: string;
  hasta: string;
  tasa: string;
  resultado: string;
}

// TODO: reemplazar por fuente real de tasas cuando esté disponible el motor de cálculo
const INTEREST_RATE_SOURCES = [
  { value: 'actas-cnat',  label: 'Actas CNAT',      jurisdiccion: 'Laboral'           },
  { value: 'bna-activa',  label: 'Tasa activa BNA',  jurisdiccion: 'Civil / Comercial' },
  { value: 'bna-pasiva',  label: 'Tasa pasiva BNA',  jurisdiccion: 'Civil / Comercial' },
  { value: 'otra',        label: 'Otra',             jurisdiccion: ''                  },
];

interface DetalleTrazabilidad {
  montoBase: string;
  fechaDesde: string;
  fechaHasta: string;
  tasaSeleccionada: string;
  tramosAplicados: number;
  fuente: string;
  vigencia: string;
  metodologia: string;
  fechaCalculo: string;
}

@Component({
  selector: 'app-modal-liquidacion',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiDateInput, PrimaryBtn, UiSelect],
  templateUrl: './modal-liquidacion.html',
})
export class ModalLiquidacion {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();

  guardando = false;
  calculado = false;

  form = {
    fechaLiquidacion: '',
    fechaDesde: '',
    fechaHasta: '',
    montoBase: '',
    tipoTasa: '',
    otrosConceptos: '',
    observaciones: '',
  };

  tipoTasaOptions = INTEREST_RATE_SOURCES.map(s => ({ value: s.value, label: s.label }));

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

  // 🔴 MOCK — reemplazar por resultado real del motor de cálculo
  calculo = { capital: '$5.000.000', intereses: '$1.200.000', otros: '$150.000', total: '$7.350.000' };

  // 🔴 MOCK — reemplazar por trazabilidad real del motor de cálculo
  detalle: DetalleTrazabilidad | null = null;

  calcular() {
    this.calculado = true;
    // TODO: reemplazar por llamada al motor real de cálculo cuando esté disponible
    this.detalle = {
      montoBase:        this.form.montoBase || '$5.000.000',
      fechaDesde:       this.form.fechaDesde || '10/06/2026',
      fechaHasta:       this.form.fechaHasta || '16/08/2026',
      tasaSeleccionada: this.tipoTasaOptions.find(t => t.value === this.form.tipoTasa)?.label ?? '—',
      tramosAplicados:  this.tramos.length,
      fuente:           'Mock — fuente a definir al implementar motor real',
      vigencia:         'Mock — vigencia a definir',
      metodologia:      'Mock — metodología a definir según fuero y tasa aplicable',
      fechaCalculo:     new Date().toLocaleDateString('es-AR'),
    };
    toast.success('Cálculo generado');
  }

  guardar() {
    this.guardando = true;
    setTimeout(() => {
      this.guardando = false;
      toast.success('Liquidación guardada correctamente');
      this.tramos = [{ id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }];
      this.calculado = false;
      this.cerrar.emit();
    }, 800);
  }
}