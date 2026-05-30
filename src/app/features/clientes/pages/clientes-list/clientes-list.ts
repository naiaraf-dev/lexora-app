import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente, ClienteService } from '../../services/cliente';
import { ClienteTable } from '../../components/cliente-table/cliente-table';
import { ClienteModal } from '../../components/cliente-modal/cliente-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ClienteTable, ClienteModal, UiInput, UiSelect, UiPagination, PrimaryBtn],
  templateUrl: './clientes-list.html',
})
export class ClientesList implements OnInit {
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];

  filtroNombre    = '';
  filtroDocumento = '';
  filtroTipo      = '';
  filtroEstado    = '';

  modalVisible       = false;
  modoModal: 'crear' | 'editar' | 'ver' = 'crear';
  clienteSeleccionado: Cliente | null = null;

  filtrosAbiertos = signal(true);

  readonly PAGE_SIZE = 10;
  paginaActual  = 1;
  get totalPaginas() { return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.PAGE_SIZE)); }
  get clientesPagina() {
    const start = (this.paginaActual - 1) * this.PAGE_SIZE;
    return this.clientesFiltrados.slice(start, start + this.PAGE_SIZE);
  }

  tipoOptions = [
    { label: 'Persona Física',   value: 'Persona Física'   },
    { label: 'Persona Jurídica', value: 'Persona Jurídica' },
  ];

  estadoOptions = [
    { label: 'Activo',   value: 'Activo'   },
    { label: 'Inactivo', value: 'Inactivo' },
  ];

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.clienteService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
      this.aplicarFiltros();
    });
  }

  abrirAltaCliente(): void {
    this.modoModal = 'crear';
    this.clienteSeleccionado = null;
    this.modalVisible = true;
  }

  abrirDetalle(cliente: Cliente): void {
    this.modoModal = 'ver';
    this.clienteSeleccionado = cliente;
    this.modalVisible = true;
  }

  abrirEdicion(cliente: Cliente): void {
    this.modoModal = 'editar';
    this.clienteSeleccionado = cliente;
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.clienteSeleccionado = null;
  }

  guardarCliente(cliente: Cliente): void {
    if (this.modoModal === 'crear') {
      this.clienteService.agregarCliente(cliente);
    } else {
      this.clienteService.actualizarCliente(cliente);
    }
    this.cerrarModal();
  }

  aplicarFiltros(): void {
    const nombre    = this.filtroNombre.toLowerCase().trim();
    const documento = this.filtroDocumento.toLowerCase().trim();

    this.clientesFiltrados = this.clientes.filter(c => {
      const nombreCliente    = (c.tipo === 'Persona Jurídica' ? (c.razonSocial ?? '') : `${c.nombre ?? ''} ${c.apellido ?? ''}`).toLowerCase();
      const documentoCliente = (c.tipo === 'Persona Jurídica' ? c.cuit : c.dni)?.toLowerCase() ?? '';

      return (!nombre    || nombreCliente.includes(nombre))
          && (!documento || documentoCliente.includes(documento))
          && (!this.filtroTipo   || c.tipo   === this.filtroTipo)
          && (!this.filtroEstado || c.estado === this.filtroEstado);
    });

    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.filtroNombre    = '';
    this.filtroDocumento = '';
    this.filtroTipo      = '';
    this.filtroEstado    = '';
    this.aplicarFiltros();
  }

  exportar(): void {
    alert('Exportación simulada. Todavía no hay backend.');
  }
}