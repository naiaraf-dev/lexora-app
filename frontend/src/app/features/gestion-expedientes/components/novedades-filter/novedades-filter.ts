import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  @Input() tipoOptions: { value: string; label: string }[] = [];

  limpiar() {
    this.filters = { buscar: '', tipo: '' };
    this.filtersChange.emit({ ...this.filters });
  }
}
