import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { FormsModule } from '@angular/forms';
import { Documento } from '../documentos-table/documentos-table';

@Component({
  selector: 'app-modal-doc-edit',
  standalone: true,
  imports: [UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn, FormsModule],
  templateUrl: './modal-doc-edit.html',
})
export class ModalDocEdit implements OnChanges {
  @Input() open = false;
  @Input() documento: Documento | null = null;
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Documento>>();

  guardando = false;
  form = { tipo: '', fechaDocumento: '', relacionadoCon: '', descripcion: '' };

  tipoOptions = [
    { value: 'ESCRITO',   label: 'Escrito' },
    { value: 'CONTRATO',  label: 'Contrato' },
    { value: 'OFICIO',    label: 'Oficio' },
    { value: 'PERICIAL',  label: 'Pericial' },
    { value: 'SENTENCIA', label: 'Sentencia' },
    { value: 'OTRO',      label: 'Otro' },
  ];

  ngOnChanges() {
    if (this.documento) {
      this.form = {
        tipo: this.documento.tipo,
        fechaDocumento: this.documento.fechaDocumento,
        relacionadoCon: this.documento.relacionadoCon,
        descripcion: this.documento.descripcion,
      };
    }
  }

  submit() {
    this.guardando = true;
    // 🔴 MOCK — reemplazar por servicio
    setTimeout(() => {
      this.guardando = false;
      this.guardar.emit({ ...this.form });
      this.cerrar.emit();
    }, 800);
  }
}