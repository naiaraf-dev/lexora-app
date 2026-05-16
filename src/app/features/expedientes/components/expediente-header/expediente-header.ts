import { Component, EventEmitter, Output } from '@angular/core';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ModalExptes } from '../modal-exptes/modal-exptes';

@Component({
  selector: 'app-expediente-header',
  standalone: true,
  imports: [PrimaryBtn, ModalExptes],
  templateUrl: './expediente-header.html',
})
export class ExpedienteHeader {
  @Output() expedienteCreado = new EventEmitter<unknown>();

  modalAbierto = false;

  abrirModal(): void {
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  onGuardar(expediente: unknown): void {
    this.modalAbierto = false;
    this.expedienteCreado.emit(expediente);
  }
}
