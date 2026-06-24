import { Component, EventEmitter, inject, Input, OnChanges, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente, TipoCliente, ClienteService } from '../../services/cliente';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiBadge, BadgeConfig } from '../../../../shared/components/ui-badge/ui-badge';

@Component({
  selector: 'app-cliente-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, PrimaryBtn, UiBadge],
  templateUrl: './cliente-modal.html',
})
export class ClienteModal implements OnChanges {
  private clienteService = inject(ClienteService);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Input() modo: 'crear' | 'editar' | 'ver' = 'crear';
  @Input() cliente: Cliente | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Cliente>();

  formCliente: Cliente = this.crearClienteVacio();

  // configuracion visual para mostrar el estado del cliente como badge
  estadoBadgeConfig: Record<string, BadgeConfig> = {
    Activo: { label: 'Activo', classes: 'bg-success/10 text-success', dot: 'bg-success' },
    Inactivo: { label: 'Inactivo', classes: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  };

  estadoOptions = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Inactivo', value: 'Inactivo' },
  ];

  // cada vez que cambia el cliente recibido, arma una copia para trabajar en el formulario
  ngOnChanges(): void {
    if (this.cliente) {
      this.formCliente = structuredClone(this.cliente);

      // si esta en modo ver, carga tambien los expedientes asociados al cliente
      if (this.modo === 'ver' && this.cliente.id) {
        this.clienteService.cargarExpedientesDeCliente(this.cliente.id).subscribe(expedientes => {
          this.formCliente = { ...this.formCliente, expedientes };
          this.cdr.detectChanges();
        });
      }
    } else {
      this.formCliente = this.crearClienteVacio();
    }
  }

  // titulo del modal segun si se esta creando, editando o viendo un cliente
  get titulo(): string {
    return { crear: 'Alta de Cliente', editar: 'Editar Cliente', ver: 'Detalle del Cliente' }[this.modo];
  }

  // estructura base para inicializar el formulario sin datos
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

  // cambia el tipo de cliente entre persona fisica y juridica
  cambiarTipo(tipo: TipoCliente): void {
    this.formCliente.tipo = tipo;
  }

  // valida el formulario y emite el cliente al componente padre
  confirmarGuardado(): void {
    if (!this.formValido) return;
    this.guardar.emit(this.formCliente);
  }

  // avisa al componente padre que se cerro el modal
  onCerrar(): void {
    this.cerrar.emit();
  }

  // devuelve el nombre visible del cliente segun su tipo
  obtenerNombreCompleto(cliente: Cliente): string {
    if (cliente.tipo === 'Persona Jurídica') return cliente.razonSocial || '-';
    return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
  }

  // devuelve dni o cuit segun corresponda
  obtenerDocumento(cliente: Cliente): string {
    return cliente.tipo === 'Persona Jurídica' ? cliente.cuit || '-' : cliente.dni || '-';
  }

  // toma la primera letra del nombre para el avatar
  get inicial(): string {
    return this.obtenerNombreCompleto(this.formCliente).charAt(0).toUpperCase();
  }

  // valida campos obligatorios segun el tipo de cliente
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