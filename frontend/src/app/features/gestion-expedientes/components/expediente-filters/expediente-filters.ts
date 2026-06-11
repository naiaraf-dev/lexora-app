import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { environment } from '../../../../../environments/environment';

export interface ExpedienteFilterState {
  numero: string;
  causa: string;
  caratula: string;
  area: string;
  tipo: string;
  estado: string;
  clienteId: string;
}

@Component({
  selector: 'app-expediente-filters',
  standalone: true,
  imports: [FormsModule, UiInput, UiSelect],
  templateUrl: './expediente-filters.html',
})
export class ExpedienteFilters implements OnInit {
  private http = inject(HttpClient);

  @Output() filtersChange = new EventEmitter<ExpedienteFilterState>();

  filtrosAbiertos = signal(true);

  filters: ExpedienteFilterState = {
    numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '',
  };

  areaOptions = [
    { value: 'CIVIL', label: 'Civil' },
    { value: 'LABORAL', label: 'Laboral' },
    { value: 'PENAL', label: 'Penal' },
    { value: 'COMERCIAL', label: 'Comercial' },
    { value: 'FAMILIA', label: 'Familia' },
    { value: 'ADMINISTRATIVO', label: 'Administrativo' },
    { value: 'TRIBUTARIO', label: 'Tributario' },
    { value: 'PREVISIONAL', label: 'Previsional' },
    { value: 'INMOBILIARIO', label: 'Inmobiliario' },
    { value: 'SOCIETARIO', label: 'Societario' },
  ];

  tipoOptions:   { value: string; label: string }[] = [];
  estadoOptions: { value: string; label: string }[] = [];
  clienteOptions:{ value: string; label: string }[] = [];

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/enums/tipoexpediente`).subscribe({
      next: (res) => this.tipoOptions = res.map(r => ({ value: String(r.id), label: r.nombre }))
    });

    this.http.get<any[]>(`${environment.apiUrl}/enums/estadoexpediente`).subscribe({
      next: (res) => this.estadoOptions = res.map(r => ({ value: String(r.id), label: r.nombre }))
    });

    this.http.get<any[]>(`${environment.apiUrl}/clientes`).subscribe({
      next: (res) => this.clienteOptions = res.map(c => ({
        value: String(c.id),
        label: `${c.nombre} ${c.apellido}`,
      }))
    });

    setTimeout(() => this.filtersChange.emit({ ...this.filters }));
  }

  buscar(): void {
    this.filtersChange.emit({ ...this.filters });
  }

  limpiar(): void {
    this.filters = { numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '' };
    this.filtersChange.emit({ ...this.filters });
  }
}