import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';

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
export class ExpedienteFilters {

  @Input() clientes: { id: string; nombre: string }[] = [];
  @Output() filtersChange = new EventEmitter<ExpedienteFilterState>();

  filters: ExpedienteFilterState = {
    numero: '',
    causa: '',
    caratula: '',
    area: '',
    tipo: '',
    estado: '',
    clienteId: '',
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

  tipoOptions = [
    { value: 'OFICIO', label: 'Oficios' },
    { value: 'CARTA_DOC', label: 'Carta Documento' },
    { value: 'MEDIACION', label: 'Mediaciones' },
    { value: 'BENEFICIO_LITIGAR', label: 'Beneficios de litigar sin gastos' },
    { value: 'COBRO_CANON', label: 'Cobro de Cánones' },
    { value: 'RECLAMO_CONTRAT', label: 'Reclamo a Contratista / Proveedor' },
    { value: 'LANZAMIENTO', label: 'Lanzamientos' },
    { value: 'RECUPERO', label: 'Recuperos' },
    { value: 'EJECUCION_GAR', label: 'Ejecución de Pólizas' },
    { value: 'DEMANDA_CIVIL', label: 'Demanda Civil' },
    { value: 'DEMANDA_LABORAL', label: 'Demanda Laboral' },
    { value: 'DEFENSA_CIVIL', label: 'Defensas Civiles' },
    { value: 'SECLOS', label: 'SECLO' },
    { value: 'CONSIGNACION', label: 'Consignaciones' },
    { value: 'DESAFUERO', label: 'Desafueros' },
    { value: 'QUERELLA', label: 'Querellas' },
    { value: 'DEFENSA_PENAL', label: 'Defensas Penales' },
    { value: 'CARTA_SUCESO', label: 'Cartas Suceso' },
    { value: 'OTRAS', label: 'Otras presentaciones / gestiones' },
  ];

  estadoOptions = [
    { value: 'EN_TRAMITE', label: 'En trámite' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'ARCHIVADO', label: 'Archivado' },
  ];

  get clienteOptions() {
    return this.clientes.map(c => ({ value: c.id, label: c.nombre }));
  }

  clearFilters(): void {
    this.filters = { numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '' };
    this.filtersChange.emit({ ...this.filters });
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(v => v !== '');
  }
}