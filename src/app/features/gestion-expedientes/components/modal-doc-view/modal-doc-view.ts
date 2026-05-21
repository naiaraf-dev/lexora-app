import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { Documento } from '../documentos-table/documentos-table';

@Component({
  selector: 'app-modal-doc-view',
  standalone: true,
  imports: [UiModal, UiInput, UiDateInput],
  templateUrl: './modal-doc-view.html',
})
export class ModalDocView {
  @Input() open = false;
  @Input() documento: Documento | null = null;
  @Output() cerrar = new EventEmitter<void>();
}