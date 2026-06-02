import { Component } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { ExpedienteTabs } from '../../components/expediente-tabs/expediente-tabs';

@Component({
  selector: 'app-expediente-edit',
  standalone: true,
  imports: [RouterOutlet, ExpedienteTabs],
  templateUrl: './expediente-edit.html',
})
export class ExpedienteEdit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  get expedienteId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  get baseUrl(): string {
    return `/gestion-expedientes/${this.expedienteId}/edit`;
  }

}