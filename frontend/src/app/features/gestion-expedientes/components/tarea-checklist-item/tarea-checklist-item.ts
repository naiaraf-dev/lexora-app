import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareaChecklist } from '../../models/estado.model';

/**
 * Fila colapsada de una tarea del checklist. Al hacer clic, avisa al padre (evento seleccionar)
 * para que muestre el detalle — en panel lateral (pantallas grandes) o desplegado abajo
 * (pantallas chicas). Esta fila en sí no sabe dónde se va a mostrar el detalle.
 */
@Component({
  selector: 'app-tarea-checklist-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarea-checklist-item.html',
})
export class TareaChecklistItem {
  @Input() numero!: number;
  @Input() tarea!: TareaChecklist;
  @Input() seleccionada = false;

  @Output() seleccionar = new EventEmitter<void>();
}