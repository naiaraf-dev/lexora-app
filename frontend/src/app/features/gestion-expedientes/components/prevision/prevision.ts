import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ModalPrevisionAlta } from '../modal-prevision-alta/modal-prevision-alta';

// 🔴 MOCK
const MOCK_PREVISION = {
  existe: true,
  estado: 'Pendiente de pago',
  estadoClase: 'bg-warning/10 text-warning',
  montoSentencia: '$5.000.000',
  montoPrevisto:  '$7.350.000',
  ultimaLiquidacion: '$7.350.000',
  fechaActualizacion: '16/08/2026',
  fechaSentencia: '10/06/2026',
  tipoSentencia: 'Definitiva',
  observaciones: 'Previsión actualizada con tasa vigente al mes de agosto.',
  estadoPago: 'Pendiente',
};

@Component({
  selector: 'app-prevision',
  standalone: true,
  imports: [CommonModule, PrimaryBtn, ModalPrevisionAlta],
  templateUrl: './prevision.html',
})
export class Prevision {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  // 🔴 MOCK — reemplazar por llamada al servicio
  prevision = MOCK_PREVISION;
  modalAltaOpen = false;

  get expedienteId(): string {
    return this.route.snapshot.parent?.paramMap.get('id') ?? '';
  }

  verDetalle() {
    // 🔴 MOCK — id de previsión fijo
    this.router.navigate(['/prevision-y-pago', 1]);
  }

  crearPrevision() {
    this.modalAltaOpen = true;
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}