import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiModal } from '../ui-modal/ui-modal';
import { PrimaryBtn } from '../primary-btn/primary-btn';

@Component({
  selector: 'app-ui-confirm-modal',
  standalone: true,
  imports: [UiModal, PrimaryBtn],
  templateUrl: './ui-confirm-modal.html',
})
export class UiConfirmModal {
  @Input() open = false;
  @Input() titulo = '¿Estás seguro?';
  @Input() mensaje = '';
  @Input() labelConfirmar = 'Eliminar';
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar  = new EventEmitter<void>();
}