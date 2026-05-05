import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type Estado = 'EN_TRAMITE' | 'FINALIZADO' | 'ARCHIVADO';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-badge.html',
})
export class UiBadge {

  @Input() estado!: Estado;

  get label(): string {
    switch (this.estado) {
      case 'EN_TRAMITE': return 'En trámite';
      case 'FINALIZADO': return 'Finalizado';
      case 'ARCHIVADO': return 'Archivado';
    }
  }

  get classes(): string {
    switch (this.estado) {
      case 'EN_TRAMITE': return 'bg-info/10 text-info';
      case 'FINALIZADO': return 'bg-success/10 text-success';
      case 'ARCHIVADO': return 'bg-gray-100 text-gray-500';
    }
  }

  get dot(): string {
    switch (this.estado) {
      case 'EN_TRAMITE': return 'bg-info';
      case 'FINALIZADO': return 'bg-success';
      case 'ARCHIVADO': return 'bg-gray-400';
    }
  }
}
