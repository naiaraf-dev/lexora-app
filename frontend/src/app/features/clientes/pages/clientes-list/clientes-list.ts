import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente, ClienteService, TipoCliente } from '../../services/cliente';
import { ClienteTable } from '../../components/cliente-table/cliente-table';
import { ClienteModal } from '../../components/cliente-modal/cliente-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import * as XLSXStyle from 'xlsx-js-style';

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

  tipoOptions: { label: string; value: TipoCliente }[] = [];

  estadoOptions = [
    { label: 'Activo',   value: 'Activo'   },
    { label: 'Inactivo', value: 'Inactivo' },
  ];

  constructor(private clienteService: ClienteService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.clienteService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
      this.aplicarFiltros();
      this.cdr.detectChanges();
    });

    this.clienteService.cargarTiposCliente().subscribe(tipos => {
      this.tipoOptions = tipos.map(t => ({
        label: t.nombre,
        value: t.nombre as TipoCliente,
      }));
      this.cdr.detectChanges();
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
      this.clienteService.agregarCliente(cliente).subscribe({
        next: () => {
          this.clienteService.cargarClientes();
          toast.success('Cliente creado correctamente');
          this.cerrarModal();
        },
        error: (err) => toast.error(err?.error?.mensaje ?? 'Error al crear cliente'),
      });
    } else {
      this.clienteService.actualizarCliente(cliente).subscribe({
        next: () => {
          this.clienteService.cargarClientes();
          toast.success('Cliente actualizado correctamente');
          this.cerrarModal();
        },
        error: (err) => toast.error(err?.error?.mensaje ?? 'Error al actualizar cliente'),
      });
    }
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
    const headers = ['Tipo', 'Nombre / Razón Social', 'DNI / CUIT', 'Email', 'Teléfono', 'Dirección', 'Estado', 'Fecha de Alta'];

    const filaHeaders = headers.map(h => ({
      v: h,
      t: 's',
      s: {
        fill: { fgColor: { rgb: '6366F1' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
          bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
          left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
          right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
        }
      }
    }));

    const filasDatos = this.clientes.map(c => [
      c.tipo,
      c.tipo === 'Persona Jurídica' ? (c.razonSocial ?? '') : `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim(),
      c.tipo === 'Persona Jurídica' ? (c.cuit ?? '') : (c.dni ?? ''),
      c.email ?? '',
      c.telefono ?? '',
      c.direccion ?? '',
      c.estado,
      c.fechaAlta,
    ].map(v => ({
      v: v ?? '',
      t: 's',
      s: {
        alignment: { vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        }
      }
    })));

    const ws = XLSXStyle.utils.aoa_to_sheet([filaHeaders, ...filasDatos]);

    ws['!cols'] = [
      { wch: 16 }, // Tipo
      { wch: 30 }, // Nombre
      { wch: 16 }, // DNI/CUIT
      { wch: 28 }, // Email
      { wch: 14 }, // Teléfono
      { wch: 30 }, // Dirección
      { wch: 10 }, // Estado
      { wch: 14 }, // Fecha Alta
    ];

    ws['!rows'] = [{ hpt: 22 }];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSXStyle.writeFile(wb, `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}