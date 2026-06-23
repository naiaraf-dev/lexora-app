import { Component } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { ExpedienteTabs } from '../../components/expediente-tabs/expediente-tabs';

/**
 * Página contenedora del expediente en modo edición.
 * Renderiza las tabs de navegación (Datos generales, Documentos, Novedades)
 * y el <router-outlet> donde se cargan las sub-páginas correspondientes.
 */

@Component({
  selector: 'app-expediente-edit',
  standalone: true,
  imports: [RouterOutlet, ExpedienteTabs],
  templateUrl: './expediente-edit.html',
})
export class ExpedienteEdit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  /** ID del expediente extraído del parámetro de ruta (:id). */
  get expedienteId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  /** URL base para la navegación entre tabs del expediente en edición. */
  get baseUrl(): string {
    return `/gestion-expedientes/${this.expedienteId}/edit`;
  }

}