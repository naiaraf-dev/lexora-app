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
  estadoId: string;
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
  estadoOptions: OpcionEnum[] = [];

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

    this.http.get<OpcionEnum[]>(`${environment.apiUrl}/enums/estadoexpediente`).subscribe({
      next: (res) => {
        this.estadoOptions = res;
        this.cdr.detectChanges();
        // Default: primer estado disponible
        if (res.length > 0 && !this.form.estadoId) {
          this.form.estadoId = String(res[0].id);
        }
      },
      error: (err) => {
        console.error('Error cargando estados de expediente:', err);
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

  /** Retorna la clase CSS para el botón de estado según su ID. */
  estadoBtnClass(id: number): string {
    const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer';

    return this.form.estadoId === String(id)
      ? `${base} border-primary bg-primary/10 text-primary`
      : `${base} border-gray-200 bg-background text-gray-500 hover:border-gray-300`;
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
      this.form.estadoId
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
      caratula:                   this.form.caratula,
      area:                       this.form.area,
      tipo_expediente:            Number(this.form.tipoId),
      estado_expediente:          Number(this.form.estadoId),
      cliente:                    this.form.clienteId ? Number(this.form.clienteId) : null,
      usuario_creacion:           this.auth.currentUser()?.id ?? 1,
      usuario_principal:          this.auth.currentUser()?.id ?? 1,
    };

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
      estadoId: '',
      clienteId: '',
    };
  }
}