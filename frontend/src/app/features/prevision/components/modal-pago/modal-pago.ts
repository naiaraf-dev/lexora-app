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
  selector: 'app-modal-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-pago.html',
})
export class ModalPago {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardarPago = new EventEmitter<any>();

  guardando = false;

  form = { fecha: '', monto: '', medio: '', referencia: '', observaciones: '' };

  // 🔴 MOCK
  resumen = { montoPrevisto: '$7.350.000', montoPagado: '$0', saldoPendiente: '$7.350.000' };

  medioOptions = [
    { value: 'transferencia', label: 'Transferencia bancaria' },
    { value: 'cheque',        label: 'Cheque'                },
    { value: 'efectivo',      label: 'Efectivo'              },
    { value: 'otro',          label: 'Otro'                  },
  ];

  guardar() {
    this.guardando = true;
    setTimeout(() => {
      this.guardando = false;
      this.guardarPago.emit({ ...this.form });
      this.cerrar.emit();
    }, 800);
  }
}