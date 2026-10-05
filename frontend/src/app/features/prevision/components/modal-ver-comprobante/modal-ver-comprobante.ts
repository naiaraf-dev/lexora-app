import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

@Component({
  selector: 'app-modal-ver-comprobante',
  standalone: true,
  imports: [CommonModule, UiModal, PrimaryBtn],
  templateUrl: './modal-ver-comprobante.html',
})
export class ModalVerComprobante {
  @Input() open = false;
  @Input() comprobante: { nombre: string; url: string } | null = null;
  @Output() cerrar = new EventEmitter<void>();

  constructor(private sanitizer: DomSanitizer) {}

  get esImagen(): boolean {
    if (!this.comprobante) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(this.comprobante.nombre);
  }

  get esPdf(): boolean {
    if (!this.comprobante) return false;
    return /\.pdf$/i.test(this.comprobante.nombre);
  }

  get urlSegura(): SafeResourceUrl | null {
    if (!this.comprobante) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.comprobante.url);
  }
}