import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { environment } from '../../../../../environments/environment';

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

@Component({
  selector: 'app-modal-exptes',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal],
  templateUrl: './modal-exptes.html',
})
export class ModalExptes implements OnInit {
  private http = inject(HttpClient);

  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardarExpediente = new EventEmitter<any>();
  
  clienteSearch = '';

  form: ExpedienteForm = this.formVacio();

  clientes:      Cliente[]     = [];
  tipoOptions:   OpcionEnum[]  = [];
  estadoOptions: OpcionEnum[]  = [];

  areaOptions = [
    { value: 'CIVIL',          label: 'Civil' },
    { value: 'LABORAL',        label: 'Laboral' },
    { value: 'PENAL',          label: 'Penal' },
    { value: 'COMERCIAL',      label: 'Comercial' },
    { value: 'FAMILIA',        label: 'Familia' },
    { value: 'ADMINISTRATIVO', label: 'Administrativo' },
    { value: 'TRIBUTARIO',     label: 'Tributario' },
    { value: 'PREVISIONAL',    label: 'Previsional' },
    { value: 'INMOBILIARIO',   label: 'Inmobiliario' },
    { value: 'SOCIETARIO',     label: 'Societario' },
  ];

  ngOnInit(): void {
    this.http.get<OpcionEnum[]>(`${environment.apiUrl}/enums/tipoexpediente`).subscribe({
      next: (res) => {
        this.tipoOptions = res;
      }
    });

    this.http.get<OpcionEnum[]>(`${environment.apiUrl}/enums/estadoexpediente`).subscribe({
      next: (res) => {
        this.estadoOptions = res;
        // Default: primer estado disponible
        if (res.length > 0 && !this.form.estadoId) {
          this.form.estadoId = String(res[0].id);
        }
      }
    });

    this.http.get<Cliente[]>(`${environment.apiUrl}/clientes`).subscribe({
      next: (res) => this.clientes = res
    });

  }

  estadoBtnClass(id: number): string {
    const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer';
    return this.form.estadoId === String(id)
      ? `${base} border-primary bg-primary/10 text-primary`
      : `${base} border-gray-200 bg-background text-gray-500 hover:border-gray-300`;
  }

  clientesFiltrados(): Cliente[] {
    const q = this.clienteSearch.toLowerCase().trim();
    if (!q) return this.clientes;
    return this.clientes.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      c.cuit.includes(q)
    );
  }

  clienteSeleccionado(id: number): boolean {
    return this.form.clienteId === String(id);
  }

  toggleCliente(id: number): void {
    this.form.clienteId = this.clienteSeleccionado(id) ? '' : String(id);
  }

  nombreClienteSeleccionado(): string {
    const c = this.clientes.find(c => String(c.id) === this.form.clienteId);
    return c ? `${c.nombre} ${c.apellido}` : '';
  }

  formValido(): boolean {
    return !!(this.form.caratula.trim() && this.form.area && this.form.tipoId && this.form.estadoId);
  }

  guardar(): void {
    if (!this.formValido()) return;

    const payload = {
      numero_expediente_judicial: this.form.nroCausa || null,
      caratula:                   this.form.caratula,
      area:                       this.form.area,
      tipo_expediente:            Number(this.form.tipoId),
      estado_expediente:          Number(this.form.estadoId),
      cliente:                    this.form.clienteId ? Number(this.form.clienteId) : null,
      // TODO: reemplazar por usuario autenticado real
      usuario_creacion:           1,
      usuario_principal:          1,
    };

    this.guardarExpediente.emit(payload);
    this.form = this.formVacio();
    this.clienteSearch = '';
    this.cerrar.emit();
  }

  onCerrar(): void {
    this.form = this.formVacio();
    this.clienteSearch = '';
    this.cerrar.emit();
  }

  private formVacio(): ExpedienteForm {
    return {
      nroCausa:  '',
      caratula:  '',
      area:      '',
      tipoId:    '',
      estadoId:  '',
      clienteId: '',
    };
  }
}