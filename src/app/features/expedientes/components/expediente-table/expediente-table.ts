import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';

export interface Expediente {
  id: string;
  numero: string;
  causa: string;
  caratula: string;
  clienteNombre: string;  // para mostrar en la grilla
  clienteIds: string[];   // para filtrar
  area: string;
  tipo: string;           // el code (ej: 'DEMANDA_CIVIL')
  tipoLabel: string;      // el label para mostrar en la grilla
  estado: 'EN_TRAMITE' | 'FINALIZADO' | 'ARCHIVADO';
  fechaInicio: string;
  ultimaActualizacion: string;
}

@Component({
  selector: 'app-expediente-table',
  standalone: true,
  imports: [UiTable],
  templateUrl: './expediente-table.html',
})
export class ExpedienteTable {

  @Input() expedientes: Expediente[] = [];
  @Input() total: number = 0;
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;

  @Output() view = new EventEmitter<Expediente>();
  @Output() edit = new EventEmitter<Expediente>();
  @Output() delete = new EventEmitter<Expediente>();
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onAction(event: { type: 'view' | 'edit' | 'delete'; row: Expediente }): void {
    if (event.type === 'view')   this.view.emit(event.row);
    if (event.type === 'edit')   this.edit.emit(event.row);
    if (event.type === 'delete') this.delete.emit(event.row);
  }
  onPageChange(page: number): void { this.pageChange.emit(page); }

  columns: TableColumn[] = [
    { key: 'numero',              label: 'N° Expediente',      type: 'text' },
    { key: 'causa',               label: 'N° Causa',           type: 'text' },
    { key: 'caratula',            label: 'Carátula',           type: 'text' },
    { key: 'clienteNombre',       label: 'Cliente',            type: 'text' },
    { key: 'area',                label: 'Área',               type: 'text' },
    { key: 'tipoLabel',           label: 'Tipo de Expediente', type: 'text' },
    {
      key: 'estado',
      label: 'Estado',
      type: 'badge',
      badgeConfig: {
        EN_TRAMITE: { label: 'En trámite', classes: 'bg-info/10 text-info',       dot: 'bg-info' },
        FINALIZADO: { label: 'Finalizado', classes: 'bg-success/10 text-success', dot: 'bg-success' },
        ARCHIVADO:  { label: 'Archivado',  classes: 'bg-gray-100 text-gray-500',  dot: 'bg-gray-400' },
      }
    },
    { key: 'fechaInicio',         label: 'Fecha Inicio',       type: 'date' },
    { key: 'ultimaActualizacion', label: 'Últ. actualización', type: 'date' },
    {
      key: 'acciones',
      label: 'Acciones',
      type: 'actions',
      getActions: () => ['view', 'edit', 'delete']
    },
  ];
}
