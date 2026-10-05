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

  comprobante: File | null = null;

  // 🔴 MOCK — reemplazar por datos reales de la previsión (input desde el padre)
  resumen = { montoPrevisto: '$7.350.000', montoPagado: '$0', saldoPendiente: '$7.350.000' };

  medioOptions = [
    { value: 'transferencia', label: 'Transferencia bancaria' },
    { value: 'cheque',        label: 'Cheque'                },
    { value: 'efectivo',      label: 'Efectivo'              },
    { value: 'otro',          label: 'Otro'                  },
  ];

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.comprobante = input.files[0];
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.comprobante = file;
  }

  eliminarComprobante() {
    this.comprobante = null;
  }

  guardar() {
    if (!this.form.fecha || !this.form.monto || !this.form.medio) {
      toast.error('Completá los campos obligatorios');
      return;
    }
    this.guardando = true;
    // 🔴 MOCK — reemplazar por PrevisionService.registrarPago() con FormData (incluye comprobante)
    setTimeout(() => {
      this.guardando = false;
      this.guardarPago.emit({ ...this.form, comprobante: this.comprobante });
      this.resetForm();
      this.cerrar.emit();
    }, 800);
  }

  cerrarModal() {
    this.resetForm();
    this.cerrar.emit();
  }

  private resetForm() {
    this.form = { fecha: '', monto: '', medio: '', referencia: '', observaciones: '' };
    this.comprobante = null;
  }
}