import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TipoCliente = 'Persona Física' | 'Persona Jurídica';
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

@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  // TODO: reemplazar por llamada HTTP al backend cuando esté disponible
  private clientesSubject = new BehaviorSubject<Cliente[]>([
    {
      id: 1,
      tipo: 'Persona Física',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '27-12345678-1',
      email: 'jperez@gmail.com',
      telefono: '1112345678',
      direccion: 'Av. Corrientes 1234, CABA',
      estado: 'Activo',
      fechaAlta: '12/03/2025',
      expedientes: [
        {
          numero: '1234/2024',
          tipo: 'Civil',
          estado: 'En trámite',
          fechaInicio: '12/03/2023',
        },
        {
          numero: '4321/2025',
          tipo: 'Sucesión',
          estado: 'En trámite',
          fechaInicio: '15/01/2024',
        },
      ],
    },
    {
      id: 2,
      tipo: 'Persona Física',
      nombre: 'Ana',
      apellido: 'Gómez',
      dni: '21-87654321-7',
      email: 'agomez@gmail.com',
      telefono: '1187654321',
      direccion: 'Av. Santa Fe 2222, CABA',
      estado: 'Inactivo',
      fechaAlta: '09/11/2024',
      expedientes: [
        {
          numero: '9081/2024',
          tipo: 'Laboral',
          estado: 'En trámite',
          fechaInicio: '09/11/2024',
        },
      ],
    },
    {
      id: 3,
      tipo: 'Persona Física',
      nombre: 'Laura',
      apellido: 'Fernández',
      dni: '18-13243557-3',
      email: 'lauraf@gmail.com',
      telefono: '1124354657',
      direccion: 'Uruguay 800, CABA',
      estado: 'Activo',
      fechaAlta: '23/01/2025',
      expedientes: [
        {
          numero: '7782/2025',
          tipo: 'Familia',
          estado: 'En trámite',
          fechaInicio: '23/01/2025',
        },
      ],
    },
    {
      id: 4,
      tipo: 'Persona Jurídica',
      razonSocial: 'LQNET S.A.',
      cuit: '30-86756453-1',
      email: 'lqnetsa@gmail.com',
      telefono: '1186756453',
      direccion: 'Lavalle 1000, CABA',
      estado: 'Activo',
      fechaAlta: '02/09/2025',
      expedientes: [
        {
          numero: '5521/2025',
          tipo: 'Comercial',
          estado: 'En trámite',
          fechaInicio: '02/09/2025',
        },
      ],
    },
  ]);

  clientes$ = this.clientesSubject.asObservable();

  obtenerClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  agregarCliente(cliente: Omit<Cliente, 'id' | 'fechaAlta' | 'expedientes'>): void {
    const nuevoCliente: Cliente = {
      ...cliente,
      id: Date.now(),
      fechaAlta: new Date().toLocaleDateString('es-AR'),
      expedientes: [],
    };

    this.clientesSubject.next([...this.clientesSubject.value, nuevoCliente]);
  }

  actualizarCliente(clienteActualizado: Cliente): void {
    const clientes = this.clientesSubject.value.map((cliente) =>
      cliente.id === clienteActualizado.id ? clienteActualizado : cliente
    );

    this.clientesSubject.next(clientes);
  }

  eliminarCliente(id: number): void {
    const clientes = this.clientesSubject.value.filter((cliente) => cliente.id !== id);
    this.clientesSubject.next(clientes);
  }
}