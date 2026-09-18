import { Component, EventEmitter, inject, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { environment } from '../../../../../environments/environment';
import { Auth } from '../../../../core/services/auth';
interface ExpedienteForm {
  nroCausa: string;
  caratula: string;
  area: string;
  tipoId: string;
  prioridadId: string;
  clienteId: string;
}

interface OpcionEnum {
  id: number;
  nombre: string;
}

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  cuit: string;
}

/**
 * Modal de alta de expedientes.
 * Carga tipos, estados y clientes desde el backend.
 * Emite el payload completo al componente padre para que lo persista via ExpedientesService.
 * El usuario autenticado se asigna automáticamente como creador y responsable principal.
 */
@Component({
  selector: 'app-modal-exptes',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal],
  templateUrl: './modal-exptes.html',
})
export class ModalExptes implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardarExpediente = new EventEmitter<any>();

  /** Texto de búsqueda para filtrar la lista de clientes en el selector. */
  clienteSearch = '';

  form: ExpedienteForm = this.formVacio();

  clientes: Cliente[] = [];
  tipoOptions: OpcionEnum[] = [];
  prioridadOptions: OpcionEnum[] = [];

  areaOptions = [
    { value: 'CIVIL', label: 'Civil' },
    { value: 'LABORAL', label: 'Laboral' },
    { value: 'PENAL', label: 'Penal' },
    { value: 'COMERCIAL', label: 'Comercial' },
    { value: 'FAMILIA', label: 'Familia' },
    { value: 'ADMINISTRATIVO', label: 'Administrativo' },
    { value: 'TRIBUTARIO', label: 'Tributario' },
    { value: 'PREVISIONAL', label: 'Previsional' },
    { value: 'INMOBILIARIO', label: 'Inmobiliario' },
    { value: 'SOCIETARIO', label: 'Societario' },
  ];

  ngOnInit(): void {
    this.http.get<OpcionEnum[]>(`${environment.apiUrl}/enums/tipoexpediente`).subscribe({
      next: (res) => {
        this.tipoOptions = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando tipos de expediente:', err);
      }
    });

    this.http.get<OpcionEnum[]>(`${environment.apiUrl}/enums/prioridad`).subscribe({
  next: (res) => {
    this.prioridadOptions = res;
    this.cdr.detectChanges();
  },
  error: (err) => {
    console.error('Error cargando prioridades:', err);
  }
});

    this.http.get<Cliente[]>(`${environment.apiUrl}/clientes`).subscribe({
      next: (res) => {
        this.clientes = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
      }
    });
  }

  

  /** Filtra la lista de clientes por nombre, apellido o CUIT según el texto de búsqueda. */
  clientesFiltrados(): Cliente[] {
    const q = this.clienteSearch.toLowerCase().trim();

    if (!q) return this.clientes;

    return this.clientes.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      c.cuit.includes(q)
    );
  }

  /** Retorna true si el cliente con el ID dado es el actualmente seleccionado en el formulario. */
  clienteSeleccionado(id: number): boolean {
    return this.form.clienteId === String(id);
  }

  /** Selecciona o deselecciona un cliente. Solo permite un cliente por expediente. */
  toggleCliente(id: number): void {
    this.form.clienteId = this.clienteSeleccionado(id) ? '' : String(id);
  }

  /** Retorna el nombre completo del cliente seleccionado para mostrarlo como chip en el formulario. */
  nombreClienteSeleccionado(): string {
    const c = this.clientes.find(c => String(c.id) === this.form.clienteId);
    return c ? `${c.nombre} ${c.apellido}` : '';
  }

  /** Valida que los campos obligatorios del alta estén completos antes de habilitar el guardado. */
  formValido(): boolean {
  return !!(
    this.form.caratula.trim() &&
    this.form.area &&
    this.form.tipoId &&
    this.form.prioridadId
  );
}

  /** Construye el payload y lo emite al padre. Requiere usuario autenticado para asignar creador. */
  guardar(): void {
  if (!this.formValido()) return;

  const usuarioActual = this.auth.currentUser();

  if (!usuarioActual?.id) {
    console.error('No hay usuario autenticado para crear el expediente.');
    return;
  }

  const payload = {
    numero_expediente_judicial: this.form.nroCausa || null,
    caratula: this.form.caratula,
    area: this.form.area,

    tipo_expediente: Number(this.form.tipoId),

    cliente: this.form.clienteId
      ? Number(this.form.clienteId)
      : null,

    prioridad: Number(this.form.prioridadId),

    usuario_creacion: usuarioActual.id,
    usuario_creacion_tareas: usuarioActual.id,
    usuario_principal: usuarioActual.id,
  };

  console.log('Payload creación expediente:', payload);

  this.guardarExpediente.emit(payload);

  this.form = this.formVacio();
  this.clienteSearch = '';
  this.cerrar.emit();
}

  /** Resetea el formulario y la búsqueda de clientes al cerrar el modal sin guardar. */
  onCerrar(): void {
    this.form = this.formVacio();
    this.clienteSearch = '';
    this.cerrar.emit();
  }

  /** Retorna un objeto vacío con la estructura inicial del formulario de alta. */
  private formVacio(): ExpedienteForm {
  return {
    nroCausa: '',
    caratula: '',
    area: '',
    tipoId: '',
    prioridadId: '',
    clienteId: '',
  };
}
}