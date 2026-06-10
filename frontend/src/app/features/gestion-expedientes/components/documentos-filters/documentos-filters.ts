import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';

export interface DocumentoFilterState {
  nombre: string;
  tipo: string;
}

@Component({
  selector: 'app-documentos-filters',
  standalone: true,
  imports: [UiInput, UiSelect],
  templateUrl: './documentos-filters.html',
})
export class DocumentosFilters {
  @Output() filtersChange = new EventEmitter<DocumentoFilterState>();

  filters: DocumentoFilterState = { nombre: '', tipo: '' };

  // Opciones de tipo de documento (pueden venir del padre o cargarse acá)
  @Input() tipoOptions: { value: string; label: string }[] = [];

  limpiar() {
    this.filters = { nombre: '', tipo: '' };
    this.filtersChange.emit({ ...this.filters });
  }
}