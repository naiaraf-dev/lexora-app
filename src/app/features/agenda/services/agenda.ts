import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type EstadoTarea = 'Pendiente' | 'Vencida' | 'Cumplida' | 'En curso';
export type PrioridadTarea = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface TareaAgenda {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora?: string;
  titulo: string;
  descripcion: string;
  expediente: string;
  cliente: string;
  responsable: string;
  area: string;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
}

@Injectable({
  providedIn: 'root',
})
export class AgendaService {
  // TODO: reemplazar por llamada HTTP al backend cuando esté disponible
  private tareasSubject = new BehaviorSubject<TareaAgenda[]>([
    {
      id: 1,
      fecha: '2026-02-05',
      hora: '',
      titulo: 'Vencimiento plazo contestación',
      descripcion: 'Último día para contestar la demanda reconvencional.',
      expediente: '2310/2025',
      cliente: 'Ana Gómez',
      responsable: 'Dra. Pérez',
      area: 'Civil',
      prioridad: 'Alta',
      estado: 'Vencida',
    },
    {
      id: 2,
      fecha: '2026-02-17',
      hora: '09:00',
      titulo: 'Reunión con cliente',
      descripcion: 'Reunión para revisar documentación pendiente.',
      expediente: '1724/2025',
      cliente: 'Laura Fernández',
      responsable: 'Dr. Gómez',
      area: 'Civil',
      prioridad: 'Media',
      estado: 'Pendiente',
    },
    {
      id: 3,
      fecha: '2026-02-20',
      hora: '',
      titulo: 'Producir prueba testimonial',
      descripcion: 'Preparar y presentar prueba testimonial.',
      expediente: '3298/2025',
      cliente: 'Pablo Martínez',
      responsable: 'Dra. Pérez',
      area: 'Civil',
      prioridad: 'Alta',
      estado: 'Cumplida',
    },
    {
      id: 4,
      fecha: '2026-01-23',
      hora: '09:00',
      titulo: 'Audiencia de conciliación',
      descripcion: 'Audiencia de conciliación programada.',
      expediente: '1724/2025',
      cliente: 'Laura Fernández',
      responsable: 'Dra. Pérez',
      area: 'Laboral',
      prioridad: 'Crítica',
      estado: 'Pendiente',
    },
    {
      id: 5,
      fecha: '2026-01-16',
      hora: '10:30',
      titulo: 'Audiencia preliminar',
      descripcion: 'Audiencia preliminar del expediente.',
      expediente: '1289/2025',
      cliente: 'Juan Pérez',
      responsable: 'Dr. López',
      area: 'Civil',
      prioridad: 'Media',
      estado: 'En curso',
    },
    {
      id: 6,
      fecha: '2026-01-14',
      hora: '15:00',
      titulo: 'Reunión con cliente',
      descripcion: 'Reunión de seguimiento.',
      expediente: '2654/2025',
      cliente: 'Juan Pérez',
      responsable: 'Dra. Pérez',
      area: 'Civil',
      prioridad: 'Baja',
      estado: 'Pendiente',
    },
  ]);

  tareas$ = this.tareasSubject.asObservable();

  // TODO: reemplazar por llamada HTTP al backend cuando esté disponible
  obtenerTareas(): TareaAgenda[] {
    return this.tareasSubject.value;
  }

  marcarCumplida(id: number): void {
    const tareas = this.tareasSubject.value.map((tarea) =>
      tarea.id === id ? { ...tarea, estado: 'Cumplida' as EstadoTarea } : tarea
    );

    this.tareasSubject.next(tareas);
  }
}