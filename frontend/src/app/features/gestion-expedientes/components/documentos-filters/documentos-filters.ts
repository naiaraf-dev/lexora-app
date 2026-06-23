import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';

export interface DocumentoFilterState {
  nombre: string;
  tipo: string;
}

/**
 * Filtros del listado de documentos de un expediente.
 * Emite el estado de filtros al padre en cada cambio o limpieza.
 */
@Component({
  selector: 'app-documentos-filters',
  standalone: true,
  imports: [UiInput, UiSelect],
  templateUrl: './documentos-filters.html',
})
export class DocumentosFilters {
  @Output() filtersChange = new EventEmitter<DocumentoFilterState>();

  /** Estado actual de los filtros de nombre y tipo. */
  filters: DocumentoFilterState = { nombre: '', tipo: '' };

  // Opciones de tipo de documento (pueden venir del padre o cargarse acá)
  @Input() tipoOptions: { value: string; label: string }[] = [];

  /** Resetea los filtros y emite el estado vacío al padre. */
  limpiar() {
    this.filters = { nombre: '', tipo: '' };
    this.filtersChange.emit({ ...this.filters });
  }
}