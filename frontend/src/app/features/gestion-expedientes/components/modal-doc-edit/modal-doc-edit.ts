import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { FormsModule } from '@angular/forms';
import { Documento } from '../documentos-table/documentos-table';

@Component({
  selector: 'app-modal-doc-edit',
  standalone: true,
  imports: [UiModal, UiSelect, UiDateInput, PrimaryBtn, FormsModule],
  templateUrl: './modal-doc-edit.html',
})
export class ModalDocEdit implements OnChanges {
  @Input() open = false;
  @Input() documento: Documento | null = null;
  @Input() tipoOptions: { value: string; label: string }[] = [];
  @Input() novedadOpciones: { value: string; label: string }[] = [];
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Documento>>();

  guardando = false;
  form = { tipo: '', fechaDocumento: '', relacionadoId: '', descripcion: '' };

  ngOnChanges() {
    if (this.documento) {
      this.form = {
        tipo:           this.documento.tipo,
        fechaDocumento: this.documento.fechaDocumento,
        relacionadoId:  this.documento.relacionadoId,
        descripcion:    this.documento.descripcion,
      };
    }
  }

  submit() {
    this.guardando = true;
    this.guardar.emit({ ...this.form });
    this.guardando = false;
    this.cerrar.emit();
  }
}