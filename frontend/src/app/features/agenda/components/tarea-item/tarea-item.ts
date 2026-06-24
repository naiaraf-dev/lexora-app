import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareaAgenda } from '../../services/agenda';

@Component({
  selector: 'app-tarea-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarea-item.html',
})
export class TareaItem {
  @Input() tarea!: TareaAgenda;
  @Output() ver = new EventEmitter<TareaAgenda>();

  // devuelve el color segun el estado de la tarea
  obtenerColorEstado(): string {
    if (this.tarea.estado === 'Vencida') return 'bg-red-500';
    if (this.tarea.estado === 'Cumplido') return 'bg-green-500';
    if (this.tarea.estado === 'En curso') return 'bg-blue-500';
    return 'bg-yellow-400';
  }
}