import { Component, EventEmitter, inject, Input, OnChanges, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ExpedientesService } from '../../services/expedientes.service';
import { Expediente } from '../expediente-table/expediente-table';

@Component({
  selector: 'app-modal-agrupar',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, PrimaryBtn],
  templateUrl: './modal-agrupar.html',
})
export class ModalAgrupar implements OnChanges {
  @Input() open = false;
  @Input() expediente: Expediente | null = null;
  @Output() cerrar  = new EventEmitter<void>();
  @Output() agrupado = new EventEmitter<{ expediente: Expediente; causaId: number; numeroCausa: string }>();

  private expedientesService = inject(ExpedientesService);
  private cdr = inject(ChangeDetectorRef);

  busqueda = '';
  causas: any[] = [];
  causaSeleccionada: any = null;
  cargando = false;
  guardando = false;

  ngOnChanges() {
    if (this.open) {
      this.busqueda = '';
      this.causas = [];
      this.causaSeleccionada = null;
      this.buscar();
    }
  }

  buscar() {
    this.cargando = true;
    this.expedientesService.listarCausas({ numero: this.busqueda }).subscribe({
      next: (res) => {
        this.causas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { 
        this.cargando = false; 
        this.cdr.detectChanges();
      }
    });
  }

  seleccionar(causa: any) {
    this.causaSeleccionada = this.causaSeleccionada?.id === causa.id ? null : causa;
  }

  confirmar() {
    if (!this.causaSeleccionada || !this.expediente) return;
    this.agrupado.emit({
      expediente: this.expediente,
      causaId: this.causaSeleccionada.id,
      numeroCausa: this.causaSeleccionada.numeroCausa,
    });
    this.cerrar.emit();
  }

  cerrarModal() {
    this.cerrar.emit();
  }
}