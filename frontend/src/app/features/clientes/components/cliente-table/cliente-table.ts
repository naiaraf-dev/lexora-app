import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Cliente } from '../../services/cliente';
import { UiTable, TableColumn, TableAction } from '../../../../shared/components/ui-table/ui-table';
import { BadgeConfig } from '../../../../shared/components/ui-badge/ui-badge';

@Component({
  selector: 'app-cliente-table',
  standalone: true,
  imports: [UiTable],
  templateUrl: './cliente-table.html',
})
export class ClienteTable {
  @Input() clientes: Cliente[] = [];

  @Output() verCliente = new EventEmitter<Cliente>();
  @Output() editarCliente = new EventEmitter<Cliente>();

  // configuracion visual para mostrar el tipo de cliente como badge
  tipoBadgeConfig: Record<string, BadgeConfig> = {
    'Persona Física': { label: 'Persona Física', classes: 'bg-info/10 text-info', dot: 'bg-info' },
    'Persona Jurídica': { label: 'Persona Jurídica', classes: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  };

  // configuracion visual para mostrar si el cliente esta activo o inactivo
  estadoBadgeConfig: Record<string, BadgeConfig> = {
    Activo: { label: 'Activo', classes: 'bg-success/10 text-success', dot: 'bg-success' },
    Inactivo: { label: 'Inactivo', classes: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  };

  // columnas que va a renderizar la tabla generica
  columns: TableColumn[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'badge',
      badgeConfig: this.tipoBadgeConfig,
    },
    {
      key: 'nombreCompleto',
      label: 'Nombre / Razón Social',
      type: 'text',
    },
    {
      key: 'documento',
      label: 'DNI / CUIT',
      type: 'text',
    },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    {
      key: 'estado',
      label: 'Estado',
      type: 'badge',
      badgeConfig: this.estadoBadgeConfig,
    },
    { key: 'fechaAlta', label: 'Fecha Alta', type: 'text' },
    {
      key: 'acciones',
      label: 'Acciones',
      type: 'actions',
      actions: ['view', 'edit'],
    },
  ];

  // acomoda los datos para que la tabla tenga nombre completo y documento ya calculados
  get data() {
    return this.clientes.map(c => ({
      ...c,
      nombreCompleto: c.tipo === 'Persona Jurídica'
        ? c.razonSocial || '-'
        : `${c.nombre || ''} ${c.apellido || ''}`.trim(),
      documento: c.tipo === 'Persona Jurídica'
        ? c.cuit || '-'
        : c.dni || '-',
    }));
  }

  // recibe la accion de la tabla y la manda al componente padre
  onAction(event: { type: TableAction; row: Cliente }): void {
    if (event.type === 'view') this.verCliente.emit(event.row);
    if (event.type === 'edit') this.editarCliente.emit(event.row);
  }
}