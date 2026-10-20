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

/**
 * Tabla de documentos con paginación y acciones por fila.
 * Soporta acciones de descarga, edición y eliminación.
 * Los badges de tipo se configuran estáticamente según los tipos conocidos.
 */
@Component({
  selector: 'app-documentos-table',
  standalone: true,
  imports: [UiTable, UiPagination],
  templateUrl: './documentos-table.html',
})
export class DocumentosTable {
  @Input() documentos: Documento[] = []; // Lista de documentos a mostrar en la tabla, ya paginada desde el padre.
  @Input() total = 0; // Total de documentos filtrados, usado para calcular la paginación.
  @Input() currentPage = 1;
  @Input() totalPages = 1;

  @Output() view     = new EventEmitter<Documento>(); // Emite el documento cuando se acciona ver.
  @Output() edit     = new EventEmitter<Documento>(); // Emite el documento cuando se acciona editar.
  @Output() delete   = new EventEmitter<Documento>(); // Emite el documento cuando se acciona eliminar.
  @Output() download = new EventEmitter<Documento>(); // Emite el documento cuando se acciona descargar.
  @Output() pageChange = new EventEmitter<number>(); // Emite el número de página cuando se cambia la paginación.

  /** Despacha la acción de la fila al output correspondiente según su tipo. */
  onAction(event: { type: TableAction; row: Documento }): void {
    if (event.type === 'view')     this.view.emit(event.row);
    if (event.type === 'edit')     this.edit.emit(event.row);
    if (event.type === 'delete')   this.delete.emit(event.row);
    if (event.type === 'download') this.download.emit(event.row);
  }

  /** Propaga el cambio de página al componente padre. */
  onPageChange(page: number): void { this.pageChange.emit(page); }

  /** Definición de columnas incluyendo badge de tipo con colores por categoría y acciones disponibles. */
  columns: TableColumn[] = [
    { key: 'nombre',        label: 'Documento',      type: 'text' },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'badge',
      badgeConfig: {
        // Variantes dark: mismo criterio que BADGE_ESTADO de previsión (fondo 900/30, texto 400; gris → slate).
        ESCRITO:   { label: 'Escrito',   classes: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',         dot: 'bg-blue-500 dark:bg-blue-400' },
        CONTRATO:  { label: 'Contrato',  classes: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500 dark:bg-purple-400' },
        OFICIO:    { label: 'Oficio',    classes: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400', dot: 'bg-indigo-500 dark:bg-indigo-400' },
        PERICIAL:  { label: 'Pericial',  classes: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',     dot: 'bg-amber-500 dark:bg-amber-400' },
        SENTENCIA: { label: 'Sentencia', classes: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',         dot: 'bg-rose-500 dark:bg-rose-400' },
        NOTIFICACION: { label: 'Notificación', classes: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-500 dark:bg-orange-400' },
        PODER:        { label: 'Poder',        classes: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',         dot: 'bg-teal-500 dark:bg-teal-400'   },
        // Tipos que agrega el módulo Previsión y pago (script 001)
        RESOLUCION:        { label: 'Resolución',          classes: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',                 dot: 'bg-rose-500 dark:bg-rose-400'       },
        LIQUIDACION:       { label: 'Liquidación',         classes: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',                 dot: 'bg-cyan-500 dark:bg-cyan-400'       },
        NOTA:              { label: 'Nota',                classes: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',                     dot: 'bg-sky-500 dark:bg-sky-400'         },
        COMPROBANTEDEPAGO: { label: 'Comprobante de pago', classes: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap', dot: 'bg-green-500 dark:bg-green-400' },
        FACTURA:           { label: 'Factura',             classes: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',                 dot: 'bg-lime-500 dark:bg-lime-400'       },
        PROVEIDO:          { label: 'Proveído',            classes: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',     dot: 'bg-fuchsia-500 dark:bg-fuchsia-400' },
        OTRO:         { label: 'Otro',         classes: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300',     dot: 'bg-gray-400 dark:bg-slate-400'   },
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
