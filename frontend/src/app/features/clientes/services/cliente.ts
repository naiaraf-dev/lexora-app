import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TipoCliente = 'Persona Física' | 'Persona Jurídica';
export type EstadoCliente = 'Activo' | 'Inactivo';

// formato de expediente que se muestra dentro del detalle del cliente
export interface ExpedienteCliente {
  numero: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
}

// modelo de cliente que usa el frontend
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
const TIPO_FISICA = 1;
const TIPO_JURIDICA = 2;

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);

  // guarda los clientes cargados y permite que los componentes se actualicen cuando cambian
  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  clientes$ = this.clientesSubject.asObservable();

  constructor() {
    this.cargarClientes();
  }

  /** GET /api/enums/tipocliente */
  // trae los tipos de cliente desde el backend
  cargarTiposCliente(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(`${environment.apiUrl}/enums/tipocliente`);
  }

  /** GET /api/clientes */
  // trae todos los clientes, los adapta al formato del front y los guarda en memoria
  cargarClientes(): void {
    this.http.get<any[]>(`${environment.apiUrl}/clientes`).subscribe({
      next: (data) => this.clientesSubject.next(data.map(c => this.mapFromBackend(c))),
    });
  }

  /** GET /api/expedientes?clienteId=:id */
  // trae los expedientes asociados a un cliente puntual
  cargarExpedientesDeCliente(clienteId: number): Observable<ExpedienteCliente[]> {
    return this.http.get<any>(`${environment.apiUrl}/expedientes?clienteId=${clienteId}`).pipe(
      map((res: any) => {
        // acomoda la respuesta para que el modal pueda mostrarla directo
        return (res.data ?? []).map((e: any) => ({
          numero: `${e.id}/${new Date(e.fechaInicio).getFullYear()}`,
          tipo: e.tipo?.nombre ?? '',
          estado: e.estado?.nombre ?? '',
          fechaInicio: e.fechaInicio ? e.fechaInicio.substring(0, 10) : '',
        }));
      })
    );
  }

  // devuelve los clientes que ya estan cargados en memoria
  obtenerClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  /** POST /api/clientes */
  // crea un cliente nuevo mandando al backend el formato que espera la api
  agregarCliente(cliente: Omit<Cliente, 'id' | 'fechaAlta' | 'expedientes'>): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/clientes`, this.mapToBackend(cliente as Cliente));
  }

  /** PUT /api/clientes/:id */
  // actualiza un cliente existente
  actualizarCliente(cliente: Cliente): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/clientes/${cliente.id}`, this.mapToBackend(cliente));
  }

  // Mapeo BD → modelo frontend
  // convierte los nombres y formatos de la base al modelo que usa Angular
  private mapFromBackend(c: any): Cliente {
    const esJuridica = c.tipo_cliente === TIPO_JURIDICA;
    return {
      id: c.id,
      tipo: esJuridica ? 'Persona Jurídica' : 'Persona Física',
      nombre: esJuridica ? undefined : (c.nombre ?? ''),
      apellido: esJuridica ? undefined : (c.apellido ?? ''),
      razonSocial: esJuridica ? (c.nombre ?? '') : undefined,
      dni: c.dni ?? undefined,
      cuit: c.cuit ?? undefined,
      email: c.email ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      fechaNacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.substring(0, 10) : undefined,
      observaciones: c.observaciones ?? undefined,
      estado: c.activo ? 'Activo' : 'Inactivo',
      fechaAlta: c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : '',
      expedientes: [],
    };
  }

  // Mapeo modelo frontend → body para el backend
  // convierte el cliente del formulario al formato que espera SQL/backend
  private mapToBackend(c: Partial<Cliente>): object {
    const esJuridica = c.tipo === 'Persona Jurídica';
    return {
      nombre: esJuridica ? (c.razonSocial ?? '') : (c.nombre ?? ''),
      apellido: esJuridica ? '' : (c.apellido ?? ''),
      email: c.email ?? null,
      telefono: c.telefono ?? null,
      dni: c.dni ?? null,
      cuit: c.cuit ?? null,
      activo: c.estado === 'Activo',
      direccion: c.direccion ?? null,
      observaciones: c.observaciones ?? null,
      fecha_nacimiento: c.fechaNacimiento ?? null,
      tipo_cliente: esJuridica ? TIPO_JURIDICA : TIPO_FISICA,
      rol_cliente: null,
    };
  }
}