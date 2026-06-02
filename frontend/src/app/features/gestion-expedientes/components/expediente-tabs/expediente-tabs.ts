import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ExpedienteTab {
  label: string;
  path: string;
  icon: 'datos' | 'documentos' | 'novedades';
}

@Component({
  selector: 'app-expediente-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './expediente-tabs.html',
})
export class ExpedienteTabs {
  @Input() baseUrl: string = '';

  tabs: ExpedienteTab[] = [
    { label: 'Datos generales', path: 'datos-generales',   icon: 'datos'      },
    { label: 'Documentos',      path: 'documentos',        icon: 'documentos' },
    { label: 'Novedades',       path: 'novedades',         icon: 'novedades'  },
  ];
}