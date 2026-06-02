import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente, TipoCliente } from '../../services/cliente';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiBadge, BadgeConfig } from '../../../../shared/components/ui-badge/ui-badge';

@Component({
  selector: 'app-cliente-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, PrimaryBtn, UiBadge],
  templateUrl: './cliente-modal.html',
})
export class ClienteModal implements OnChanges {
  @Input() visible = false;
  @Input() modo: 'crear' | 'editar' | 'ver' = 'crear';
  @Input() cliente: Cliente | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Cliente>();

  formCliente: Cliente = this.crearClienteVacio();

  estadoBadgeConfig: Record<string, BadgeConfig> = {
    Activo:   { label: 'Activo',   classes: 'bg-success/10 text-success', dot: 'bg-success' },
    Inactivo: { label: 'Inactivo', classes: 'bg-danger/10 text-danger',   dot: 'bg-danger'  },
  };

  estadoOptions = [
    { label: 'Activo',   value: 'Activo'   },
    { label: 'Inactivo', value: 'Inactivo' },
  ];

  ngOnChanges(): void {
    if (this.cliente) {
      this.formCliente = structuredClone(this.cliente);
    } else {
      this.formCliente = this.crearClienteVacio();
    }
  }

  get titulo(): string {
    return { crear: 'Alta de Cliente', editar: 'Editar Cliente', ver: 'Detalle del Cliente' }[this.modo];
  }

  crearClienteVacio(): Cliente {
    return {
      id: 0,
      tipo: 'Persona Física',
      nombre: '',
      apellido: '',
      razonSocial: '',
      dni: '',
      cuit: '',
      email: '',
      telefono: '',
      direccion: '',
      fechaNacimiento: '',
      contactoAlternativo: '',
      observaciones: '',
      estado: 'Activo',
      fechaAlta: '',
      expedientes: [],
    };
  }

  cambiarTipo(tipo: TipoCliente): void {
    this.formCliente.tipo = tipo;
  }

  confirmarGuardado(): void {
    if (!this.formValido) return;
    this.guardar.emit(this.formCliente);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  obtenerNombreCompleto(cliente: Cliente): string {
    if (cliente.tipo === 'Persona Jurídica') return cliente.razonSocial || '-';
    return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
  }

  obtenerDocumento(cliente: Cliente): string {
    return cliente.tipo === 'Persona Jurídica' ? cliente.cuit || '-' : cliente.dni || '-';
  }

  get inicial(): string {
    return this.obtenerNombreCompleto(this.formCliente).charAt(0).toUpperCase();
  }

  get formValido(): boolean {
    if (this.formCliente.tipo === 'Persona Física') {
      return !!(
        this.formCliente.nombre?.trim() &&
        this.formCliente.apellido?.trim() &&
        this.formCliente.dni?.trim() &&
        this.formCliente.email?.trim() &&
        this.formCliente.telefono?.trim()
      );
    } else {
      return !!(
        this.formCliente.razonSocial?.trim() &&
        this.formCliente.cuit?.trim() &&
        this.formCliente.email?.trim() &&
        this.formCliente.telefono?.trim()
      );
    }
  }
}