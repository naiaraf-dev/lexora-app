import { Component, EventEmitter, Output } from '@angular/core';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

export interface NovedadFilterState {
  buscar: string;
  tipo: string;
}

@Component({
  selector: 'app-novedades-filter',
  standalone: true,
  imports: [UiInput, UiSelect, PrimaryBtn],
  templateUrl: './novedades-filter.html',
  styles: ``,
})
export class NovedadesFilter {
  @Output() filtersChange = new EventEmitter<NovedadFilterState>();
  @Output() nuevaNovedad  = new EventEmitter<void>();

  filters: NovedadFilterState = { buscar: '', tipo: '' };

  tipoOptions = [
    { value: 'PRESENTACION', label: 'Presentación' },
    { value: 'AUDIENCIA',    label: 'Audiencia' },
    { value: 'RESOLUCION',   label: 'Resolución' },
    { value: 'OFICIO',       label: 'Oficio' },
    { value: 'PERICIA',      label: 'Pericia' },
    { value: 'NOTIFICACION', label: 'Notificación' },
    { value: 'OTRO',         label: 'Otro' },
  ];
}
