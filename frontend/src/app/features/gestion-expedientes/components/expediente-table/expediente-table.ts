import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiTable, TableColumn, TableAction } from '../../../../shared/components/ui-table/ui-table';
import { Router } from '@angular/router';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { CommonModule } from '@angular/common';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';

export interface Expediente {
  id: number;
  numeroInterno: string;
  numeroExpedienteJudicial?: string;
  caratula: string;
  area: string;
  fechaInicio: string;
  ultimaActualizacion: string;
  tipo: { id: number; nombre: string };
  estado: { id: number; nombre: string };
  cliente?: { id: number; nombre: string };
  usuarioPrincipal?: { id: number; nombre: string };
}

/**
 * Tabla de expedientes con paginación y acciones por fila.
 * Navega a la vista o edición del expediente según la acción.
 * Gestiona internamente el modal de confirmación de eliminación
 * y emite el evento delete al padre para que ejecute el borrado (Baja lógica).
 */
@Component({
  selector: 'app-expediente-table',
  standalone: true,
  imports: [UiTable, UiPagination, UiConfirmModal, CommonModule],
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

  expedienteAEliminar: Expediente | null = null; // Expediente seleccionado para eliminar. Controla la apertura del modal de confirmación.

  constructor(private router: Router) {}

  /** Maneja las acciones de la tabla: navega a view/edit o abre el modal de confirmación para delete. */
  onAction(event: { type: TableAction; row: Expediente }): void {
    if (event.type === 'view')   this.router.navigate(['/gestion-expedientes', event.row.id]);
    if (event.type === 'edit')   this.router.navigate(['/gestion-expedientes', event.row.id, 'edit']);
    if (event.type === 'delete') this.expedienteAEliminar = event.row;
  }

  /** Emite el expediente seleccionado al padre para que ejecute el borrado y cierra el modal. */
  confirmarEliminar(): void {
    if (this.expedienteAEliminar) {
      this.delete.emit(this.expedienteAEliminar);
      this.expedienteAEliminar = null;
    }
  }

  /** Cancela la eliminación y cierra el modal de confirmación sin emitir nada. */
  cancelarEliminar(): void {
    this.expedienteAEliminar = null;
  }

  /** Propaga el cambio de página al componente padre. */
  onPageChange(page: number): void { this.pageChange.emit(page); }

  columns: TableColumn[] = [
    { key: 'numeroInterno',           label: 'N° Expediente',      type: 'text' },
    { key: 'numeroExpedienteJudicial',label: 'N° Causa',           type: 'text' },
    { key: 'caratula',                label: 'Carátula',           type: 'text' },
    { key: 'cliente.nombre',          label: 'Cliente',            type: 'text' },
    { key: 'area',                    label: 'Área',               type: 'text' },
    { key: 'tipo.nombre',             label: 'Tipo de Expediente', type: 'text' },
    { key: 'estado.nombre',           label: 'Estado',             type: 'text' },
    { key: 'fechaInicio',             label: 'Fecha Inicio',       type: 'date' },
    { key: 'ultimaActualizacion',     label: 'Últ. actualización', type: 'date', format: 'datetime' },
    {
      key: 'acciones',
      label: 'Acciones',
      type: 'actions',
      getActions: () => ['view', 'edit', 'delete']
    },
  ];

  /** Mensaje dinámico del modal de confirmación con el número interno del expediente. */
  get mensajeConfirmarEliminar(): string {
    return `¿Estás seguro que querés eliminar el expediente "${this.expedienteAEliminar?.numeroInterno}"? Esta acción no se puede deshacer.`;
  }
}
