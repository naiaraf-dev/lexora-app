import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsistenteChat } from '../../../asistente/components/asistente-chat/asistente-chat';
import { ExpedientesService } from '../../services/expedientes.service';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

@Component({
  selector: 'app-asistente-expediente',
  standalone: true,
  imports: [AsistenteChat, PrimaryBtn],
  templateUrl: './asistente-expediente.html',
})
export class AsistenteExpediente implements OnInit {
  private route = inject(ActivatedRoute);
  private expedientesService = inject(ExpedientesService);
  private router = inject(Router);

  /** Número interno del expediente (ej: EXP-2026-26), igual al que se ve en la bandeja. */
  numero = signal('');

  /** Se completa si no se pudo cargar el expediente: sin número válido, Litis no puede trabajar sobre él. */
  error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.parent?.paramMap.get('id'));
    const noDisponible = 'No se pudo cargar el expediente, así que Litis no puede trabajar sobre él. Probá de nuevo en unos minutos.';

    this.expedientesService.obtener(id).subscribe({
      next: (exp) => {
        // el backend valida el formato EXP-año-id: un número armado a mano lo rechazaría
        if (/^EXP-\d{4}-\d+$/.test(exp?.numeroInterno ?? '')) this.numero.set(exp.numeroInterno);
        else this.error.set(noDisponible);
      },
      error: () => this.error.set(noDisponible),
    });
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}