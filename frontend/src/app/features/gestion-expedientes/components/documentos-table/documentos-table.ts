import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiTable, TableColumn, TableAction } from '../../../../shared/components/ui-table/ui-table';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';

export interface Documento {
  id: string;
  nombre: string;         // "Demanda inicial.pdf"
  tipo: string;           // código: 'ESCRITO', 'CONTRATO', etc.
  tipoLabel: string;      // label para mostrar
  relacionadoCon: string; // "Novedad: Oficio recibido" (texto libre por ahora)
  relacionadoId: string;
  fechaCarga: string;     // ISO date
  tamanio: string;        // "3.4 MB"
  descripcion: string;
  fechaDocumento: string;
  url: string;
}

@Component({
  selector: 'app-documentos-table',
  standalone: true,
  imports: [UiTable, UiPagination],
  templateUrl: './documentos-table.html',
})
export class DocumentosTable {
  @Input() documentos: Documento[] = [];
  @Input() total = 0;
  @Input() currentPage = 1;
  @Input() totalPages = 1;

  @Output() view     = new EventEmitter<Documento>();
  @Output() edit     = new EventEmitter<Documento>();
  @Output() delete   = new EventEmitter<Documento>();
  @Output() download = new EventEmitter<Documento>();
  @Output() pageChange = new EventEmitter<number>();

  onAction(event: { type: TableAction; row: Documento }): void {
    if (event.type === 'view')     this.view.emit(event.row);
    if (event.type === 'edit')     this.edit.emit(event.row);
    if (event.type === 'delete')   this.delete.emit(event.row);
    if (event.type === 'download') this.download.emit(event.row);
  }

  onPageChange(page: number): void { this.pageChange.emit(page); }

  columns: TableColumn[] = [
    { key: 'nombre',        label: 'Documento',      type: 'text' },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'badge',
      badgeConfig: {
        ESCRITO:   { label: 'Escrito',   classes: 'bg-blue-100 text-blue-600',     dot: 'bg-blue-500' },
        CONTRATO:  { label: 'Contrato',  classes: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' },
        OFICIO:    { label: 'Oficio',    classes: 'bg-indigo-100 text-indigo-600', dot: 'bg-indigo-500' },
        PERICIAL:  { label: 'Pericial',  classes: 'bg-amber-100 text-amber-600',   dot: 'bg-amber-500' },
        SENTENCIA: { label: 'Sentencia', classes: 'bg-rose-100 text-rose-600',     dot: 'bg-rose-500' },
        NOTIFICACION: { label: 'Notificación', classes: 'bg-orange-100 text-orange-600', dot: 'bg-orange-500' },
        PODER:        { label: 'Poder',        classes: 'bg-teal-100 text-teal-600',     dot: 'bg-teal-500'   },
        OTRO:         { label: 'Otro',         classes: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400'   },
      }
    },
    { key: 'fechaDocumento', label: 'Fecha del documento',  type: 'date' },
    { key: 'descripcion',    label: 'Descripción',          type: 'text' },
    { key: 'relacionadoCon', label: 'Relacionado a',        type: 'text' },
    { key: 'fechaCarga',     label: 'Fecha de carga',       type: 'date' },
    { key: 'tamanio',        label: 'Tamaño',               type: 'text' },
    {
      key: 'acciones',
      label: 'Acciones',
      type: 'actions',
      getActions: () => ['download', 'edit', 'delete'] as any
    },
  ];
}
