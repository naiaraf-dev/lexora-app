import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ExpedienteTab {
  label: string;
  path: string;
  icon: 'datos' | 'documentos' | 'novedades';
}

/**
 * Barra de tabs de navegación del expediente en modo edición.
 * Recibe la URL base del padre y construye los links a cada sub-página
 * (Datos generales, Documentos, Novedades) usando routerLink.
 */
@Component({
  selector: 'app-expediente-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './expediente-tabs.html',
})
export class ExpedienteTabs {
  /** URL base del expediente en edición. Se combina con el path de cada tab para armar el routerLink. */
  @Input() baseUrl: string = '';

  /** Definición de las tabs disponibles con su label, path e ícono. */
  tabs: ExpedienteTab[] = [
    { label: 'Datos generales', path: 'datos-generales',   icon: 'datos'      },
    { label: 'Documentos',      path: 'documentos',        icon: 'documentos' },
    { label: 'Novedades',       path: 'novedades',         icon: 'novedades'  },
  ];
}