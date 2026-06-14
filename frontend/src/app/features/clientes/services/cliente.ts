import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TipoCliente   = 'Persona Física' | 'Persona Jurídica';
export type EstadoCliente = 'Activo' | 'Inactivo';

export interface ExpedienteCliente {
  numero: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
}

export interface Cliente {
  id: number;
  tipo: TipoCliente;

  nombre?: string;
  apellido?: string;
  razonSocial?: string;

  dni?: string;
  cuit?: string;

  email: string;
  telefono: string;
  direccion: string;

  fechaNacimiento?: string;
  contactoAlternativo?: string;
  observaciones?: string;

  estado: EstadoCliente;
  fechaAlta: string;

  expedientes: ExpedienteCliente[];
}

// tipo_cliente en BD: 1 = Persona Física, 2 = Persona Jurídica
const TIPO_FISICA   = 1;
const TIPO_JURIDICA = 2;

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);

  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  clientes$ = this.clientesSubject.asObservable();

  constructor() {
    this.cargarClientes();
  }

  /** GET /api/clientes */
  cargarClientes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/clientes`).subscribe({
      next: (data) => this.clientesSubject.next(data.map(c => this.mapFromBackend(c))),
      error: (err) => console.error('Error al obtener clientes:', err),
    });
  }

  obtenerClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  /** POST /api/clientes */
  agregarCliente(cliente: Omit<Cliente, 'id' | 'fechaAlta' | 'expedientes'>): void {
    this.http.post<any>(`${environment.apiUrl}/api/clientes`, this.mapToBackend(cliente as Cliente)).subscribe({
      next: () => this.cargarClientes(),
      error: (err) => console.error('Error al crear cliente:', err),
    });
  }

  /** PUT /api/clientes/:id */
  actualizarCliente(cliente: Cliente): void {
    this.http.put<any>(`${environment.apiUrl}/api/clientes/${cliente.id}`, this.mapToBackend(cliente)).subscribe({
      next: () => this.cargarClientes(),
      error: (err) => console.error('Error al actualizar cliente:', err),
    });
  }

  // Mapeo BD → modelo frontend
  private mapFromBackend(c: any): Cliente {
    const esJuridica = c.tipo_cliente === TIPO_JURIDICA;
    return {
      id:              c.id,
      tipo:            esJuridica ? 'Persona Jurídica' : 'Persona Física',
      nombre:          esJuridica ? undefined : (c.nombre ?? ''),
      apellido:        esJuridica ? undefined : (c.apellido ?? ''),
      razonSocial:     esJuridica ? (c.nombre ?? '') : undefined,
      dni:             c.dni ?? undefined,
      cuit:            c.cuit ?? undefined,
      email:           c.email ?? '',
      telefono:        c.telefono ?? '',
      direccion:       c.direccion ?? '',
      fechaNacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.substring(0, 10) : undefined,
      observaciones:   c.observaciones ?? undefined,
      estado:          c.activo ? 'Activo' : 'Inactivo',
      fechaAlta:       c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : '',
      expedientes:     [],
    };
  }

  // Mapeo modelo frontend → body para el backend
  private mapToBackend(c: Partial<Cliente>): object {
    const esJuridica = c.tipo === 'Persona Jurídica';
    return {
      nombre:           esJuridica ? (c.razonSocial ?? '') : (c.nombre ?? ''),
      apellido:         esJuridica ? '' : (c.apellido ?? ''),
      email:            c.email ?? null,
      telefono:         c.telefono ?? null,
      dni:              c.dni ?? null,
      cuit:             c.cuit ?? null,
      activo:           c.estado === 'Activo',
      direccion:        c.direccion ?? null,
      observaciones:    c.observaciones ?? null,
      fecha_nacimiento: c.fechaNacimiento ?? null,
      tipo_cliente:     esJuridica ? TIPO_JURIDICA : TIPO_FISICA,
      rol_cliente:      null,
    };
  }
}
