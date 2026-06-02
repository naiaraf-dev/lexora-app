import { Component, Input, signal } from '@angular/core';

/**
 * Card blanca reutilizable usada en las secciones del expediente.
 * - `title`: encabezado de la sección.
 * - `collapsible`: muestra el toggle (–/+) para colapsar el contenido.
 * - Proyectá contenido a la derecha del título con `slot="header-actions"`.
 */
@Component({
  selector: 'app-info-card',
  standalone: true,
  templateUrl: './info-card.html',
})
export class InfoCard {
  @Input() title = '';
  @Input() collapsible = false;

  collapsed = signal(false);

  toggle() {
    if (this.collapsible) this.collapsed.update((v) => !v);
  }
}