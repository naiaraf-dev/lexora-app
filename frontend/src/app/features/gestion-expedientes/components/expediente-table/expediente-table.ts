import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableColumn, TableAction } from '../../../../shared/components/ui-table/ui-table';
import { Router } from '@angular/router';
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

export interface Causa {
  id: number;
  numeroCausa: string;
  area: string;
  expedientePrincipalId: number | null;
  expedientes: Expediente[];
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
  imports: [UiConfirmModal, CommonModule],
  templateUrl: './expediente-table.html',
})
export class ExpedienteTable {

  @Input() expedientes: Expediente[] = [];
  @Input() total: number = 0;
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() causas: Causa[] = [];

  @Output() view = new EventEmitter<Expediente>();
  @Output() edit = new EventEmitter<Expediente>();
  @Output() delete = new EventEmitter<Expediente>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() agrupar    = new EventEmitter<Expediente>();
  @Output() desagrupar = new EventEmitter<Expediente>();

  expedienteAEliminar: Expediente | null = null; // Expediente seleccionado para eliminar. Controla la apertura del modal de confirmación.

  expandidas = new Set<number>();

  constructor(private router: Router) {}

  /** Maneja las acciones de la tabla: navega a view/edit o abre el modal de confirmación para delete. */
  onAction(type: TableAction, row: any): void {
    if (type === 'view')   this.router.navigate(['/gestion-expedientes', row.id]);
    if (type === 'edit')   this.router.navigate(['/gestion-expedientes', row.id, 'edit']);
    if (type === 'delete') this.expedienteAEliminar = row;
    if (type === 'agrupar')    this.agrupar.emit(row);
    if (type === 'desagrupar') this.desagrupar.emit(row);
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

  toggleCausa(id: number): void {
    if (this.expandidas.has(id)) {
      this.expandidas.delete(id);
    } else {
      this.expandidas.add(id);
    }
  }

  estaExpandida(id: number): boolean {
    return this.expandidas.has(id);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
