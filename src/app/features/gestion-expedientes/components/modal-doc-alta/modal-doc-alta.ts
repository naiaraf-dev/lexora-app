import { Component, EventEmitter, Output } from '@angular/core';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { FormsModule } from '@angular/forms';
import { Documento } from '../documentos-table/documentos-table';

@Component({
  selector: 'app-modal-doc-alta',
  standalone: true,
  imports: [UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn, FormsModule],
  templateUrl: './modal-doc-alta.html',
})
export class ModalDocAlta {
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Documento>>();

  open = false;
  guardando = false;

  form = {
    nombre: '', tipo: '', fechaDocumento: '',
    relacionadoCon: '', descripcion: '', archivo: null as File | null,
  };

  tipoOptions = [
    { value: 'ESCRITO',   label: 'Escrito' },
    { value: 'CONTRATO',  label: 'Contrato' },
    { value: 'OFICIO',    label: 'Oficio' },
    { value: 'PERICIAL',  label: 'Pericial' },
    { value: 'SENTENCIA', label: 'Sentencia' },
    { value: 'OTRO',      label: 'Otro' },
  ];

  abrir() { this.open = true; }
  cerrarModal() { this.open = false; this.cerrar.emit(); }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.form.archivo = input.files[0];
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.form.archivo = file;
  }

  submit() {
    this.guardando = true;
    // 🔴 MOCK — reemplazar por servicio
    setTimeout(() => {
      this.guardando = false;
      this.guardar.emit({ ...this.form });
      this.open = false;
    }, 800);
  }
}