import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiBadge } from '../../../../shared/components/ui-badge/ui-badge';
import { ModalPrevisionAltaGlobal } from '../../../prevision/components/modal-prevision-alta/modal-prevision-alta';
import { PrevisionService } from '../../../prevision/services/prevision.service';
import { ExpedientesService } from '../../services/expedientes.service';
import { PrevisionResumen } from '../../../prevision/models/prevision.model';
import { BADGE_ESTADO, BADGE_MODO, OBLIGADO_LABEL, formatFecha, formatMonto } from '../../../prevision/models/prevision.constants';

@Component({
  selector: 'app-prevision',
  standalone: true,
  imports: [CommonModule, PrimaryBtn, ModalPrevisionAltaGlobal, UiBadge],
  templateUrl: './prevision.html',
})
export class Prevision implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private previsionService = inject(PrevisionService);
  private expedientesService = inject(ExpedientesService);
  private cdr = inject(ChangeDetectorRef);

  expedienteId!: number;
  expedienteNumero = '';
  previsiones: PrevisionResumen[] = [];
  habilitaPrevision = true;
  cargando = true;
  modalAltaOpen = false;

  /**
   * Si el expediente es parte de una causa y no es el principal, las previsiones viven en el principal:
   * acá se muestran las del principal, en solo lectura.
   */
  soloLectura = false;
  principal: { id: number; numero: string; numeroCausa: string } | null = null;

  readonly BADGE_ESTADO = BADGE_ESTADO;
  readonly BADGE_MODO = BADGE_MODO;
  readonly OBLIGADO_LABEL = OBLIGADO_LABEL;
  formatMonto = formatMonto;
  formatFecha = formatFecha;

  /** La más reciente (el id más alto). */
  get ultima(): PrevisionResumen | null {
    return this.previsiones[0] ?? null;
  }

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));

    this.expedientesService.obtener(this.expedienteId).subscribe({
      next: (exp) => {
        this.expedienteNumero = exp.numeroInterno; // EXP-año-id, igual que en Gestión de expedientes
        // 🔴 Hasta que el back devuelva habilitaPrevision (sale de tipoestadoexpediente), se asume true
        this.habilitaPrevision = exp.habilitaPrevision ?? true;

        const causa = exp.causa; // { id, numero, expedientePrincipalId, principalNumero } o null
        if (causa?.expedientePrincipalId && causa.expedientePrincipalId !== exp.id) {
          this.soloLectura = true;
          this.principal = {
            id: causa.expedientePrincipalId,
            numero: causa.principalNumero ?? String(causa.expedientePrincipalId),
            numeroCausa: causa.numero,
          };
        }
        this.cargar();
      },
      error: () => this.cargar(),
    });
  }

  cargar(): void {
    this.cargando = true;
    const id = this.principal?.id ?? this.expedienteId;
    this.previsionService.listarPorExpediente(id).subscribe(lista => {
      this.previsiones = [...lista].sort((a, b) => b.id - a.id);
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  crearPrevision(): void {
    if (!this.habilitaPrevision || this.soloLectura) return;
    this.modalAltaOpen = true;
  }

  verDetalle(id: number): void {
    this.router.navigate(['/prevision-y-pago', id]);
  }

  /** Lleva al listado general filtrado por este expediente. */
  verTodas(): void {
    const numero = this.principal?.numero ?? this.expedienteNumero;
    this.router.navigate(['/prevision-y-pago'], { queryParams: { expediente: numero } });
  }

  irAlPrincipal(): void {
    if (this.principal) this.router.navigate(['/gestion-expedientes', this.principal.id]);
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}