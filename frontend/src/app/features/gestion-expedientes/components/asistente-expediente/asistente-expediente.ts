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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.parent?.paramMap.get('id'));

    this.expedientesService.obtener(id).subscribe({
      next: (exp) => this.numero.set(exp.numeroInterno ?? `EXP-${id}`),
      error: () => this.numero.set(`EXP-${id}`),
    });
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}