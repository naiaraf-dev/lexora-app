import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-modal-prevision-alta',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-prevision-alta.html',
})
export class ModalPrevisionAlta {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();

  guardando = false;
  calculado = false;

  // 🔴 MOCK — datos de contexto del expediente
  expedienteCtx = {
    numero: 'EXP-2026-00123',
    tipo: 'Demanda Civil',
    cliente: 'Empresa Constructora S.A.',
    caratula: 'Empresa Constructora S.A. c/ Provincia s/ daños y perjuicios',
    area: 'Civil',
  };

  form = {
    concepto: '',
    montoBase: '',
    fechaBase: '',
    fechaEstimadaPago: '',
    observaciones: '',
  };

  // 🔴 MOCK — resultado de cálculo
  calculo = {
    montoBase:    '$5.000.000',
    actualizacion:'$1.200.000',
    intereses:    '$1.150.000',
    total:        '$7.350.000',
  };

  conceptoOptions = [
    { value: 'sentencia',     label: 'Sentencia'     },
    { value: 'acuerdo',       label: 'Acuerdo'       },
    { value: 'indemnizacion', label: 'Indemnización' },
    { value: 'otro',          label: 'Otro'          },
  ];

  calcular() {
    // 🔴 MOCK — cálculo real se implementa con el back
    this.calculado = true;
    toast.success('Cálculo generado correctamente');
  }

  guardar() {
    if (!this.form.concepto || !this.form.montoBase || !this.form.fechaBase) {
      toast.error('Completá los campos obligatorios');
      return;
    }
    this.guardando = true;
    // 🔴 MOCK
    setTimeout(() => {
      this.guardando = false;
      toast.success('Previsión creada correctamente');
      this.cerrar.emit();
    }, 800);
  }

  cerrarModal() { this.cerrar.emit(); }
}