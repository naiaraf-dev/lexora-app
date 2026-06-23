import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

export interface NovedadFilterState {
  buscar: string;
  tipo: string;
}

/**
 * Barra de filtros del timeline de novedades.
 * Filtra por texto libre (título/descripción) y tipo de novedad.
 * Emite el estado de filtros al padre en cada cambio.
 */
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

  /** Estado actual de los filtros de búsqueda y tipo. */
  filters: NovedadFilterState = { buscar: '', tipo: '' };

  /** Opciones de tipo de novedad recibidas del componente padre. */
  @Input() tipoOptions: { value: string; label: string }[] = [];

  /** Resetea los filtros y emite el estado vacío al padre. */
  limpiar() {
    this.filters = { buscar: '', tipo: '' };
    this.filtersChange.emit({ ...this.filters });
  }
}
