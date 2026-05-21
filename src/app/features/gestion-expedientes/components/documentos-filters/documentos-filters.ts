import { Component, EventEmitter, Output } from '@angular/core';
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

  tipoOptions = [
    { value: 'ESCRITO',   label: 'Escrito' },
    { value: 'CONTRATO',  label: 'Contrato' },
    { value: 'OFICIO',    label: 'Oficio' },
    { value: 'PERICIAL',  label: 'Pericial' },
    { value: 'SENTENCIA', label: 'Sentencia' },
    { value: 'OTRO',      label: 'Otro' },
  ];
}