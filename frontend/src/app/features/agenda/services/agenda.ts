import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, switchMap, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

export type EstadoTarea = 'Pendiente' | 'Vencida' | 'Cumplido' | 'En curso';
export type PrioridadTarea = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface TareaAgenda {
  id: number;

  expedienteId: number;
  novedadId: number | null;
  prioridadId: number;
  estadoTareaId: number;
  usuarioCreacionId: number;
  usuarioCompletadoId: number | null;

  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm

  fechaCreacion: string;
  fechaUltimaModificacion: string | null;

  titulo: string;
  descripcion: string;

  expediente: string;
  novedad: string;
  cliente: string;
  responsable: string;
  usuarioCompletado: string;
  area: string;

  prioridad: PrioridadTarea;
  estado: EstadoTarea;
}

interface TareaBackend {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_creacion: string;
  fecha_ultima_modificacion: string | null;
  fecha_vencimiento: string | null;

  expediente: number;
  nombre_expediente: string;

  novedad: number | null;
  titulo_novedad?: string | null;

  usuario_creacion: number;
  nombre_usuario_creacion: string;
  apellido_usuario_creacion: string;

  usuario_completado: number | null;
  nombre_usuario_completado: string | null;
  apellido_usuario_completado: string | null;

  prioridad: number;
  nombre_prioridad: PrioridadTarea;

  estado_tarea: number;
  nombre_estado_tarea: EstadoTarea;
  hora: string | null;
  nombre_cliente: string | null;
}

interface EstadoTareaEnum {
  id: number;
  nombre: EstadoTarea;
}

interface PrioridadEnum {
  id: number;
  nombre: PrioridadTarea;
}

@Injectable({
  providedIn: 'root',
})
export class AgendaService {
  private readonly apiUrl = 'http://localhost:5000/api';

  private tareasSubject = new BehaviorSubject<TareaAgenda[]>([]);
  tareas$ = this.tareasSubject.asObservable();

  private estadosTarea: EstadoTareaEnum[] = [];
  private prioridades: PrioridadEnum[] = [];

  constructor(private http: HttpClient) {}

  cargarTareas(): Observable<TareaAgenda[]> {
    return this.http.get<TareaBackend[]>(`${this.apiUrl}/tareas`).pipe(
      map((tareasBackend) => tareasBackend.map((tarea) => this.mapearTarea(tarea))),
      tap((tareas) => this.tareasSubject.next(tareas))
    );
  }

  obtenerTareas(): TareaAgenda[] {
    return this.tareasSubject.value;
  }

  obtenerEstadosTarea(): Observable<EstadoTareaEnum[]> {
    return this.http.get<EstadoTareaEnum[]>(`${this.apiUrl}/enums/estadotarea`).pipe(
      tap((estados) => {
        this.estadosTarea = estados;
      })
    );
  }

  obtenerPrioridades(): Observable<PrioridadEnum[]> {
    return this.http.get<PrioridadEnum[]>(`${this.apiUrl}/enums/prioridad`).pipe(
      tap((prioridades) => {
        this.prioridades = prioridades;
      })
    );
  }

  buscarTareas(filtros: {
    titulo?: string;
    descripcion?: string;
    nombreExpediente?: string;
    expediente?: number;
    novedad?: number;
    prioridad?: number;
    estadoTarea?: number;
    usuarioCreacion?: number;
    usuarioCompletado?: number;
    fechaCreacion?: string;
    fechaVencimiento?: string;
  }): Observable<TareaAgenda[]> {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<TareaBackend[]>(`${this.apiUrl}/tarea`, { params }).pipe(
      map((tareasBackend) => tareasBackend.map((tarea) => this.mapearTarea(tarea))),
      tap((tareas) => this.tareasSubject.next(tareas))
    );
  }

  insertarTarea(tarea: {
    titulo: string;
    descripcion?: string;
    expediente: number;
    novedad?: number | null;
    usuario_creacion: number;
    usuario_completado?: number | null;
    prioridad: number;
    estado_tarea: number;
    fecha_vencimiento?: string | null;
    hora: string | null;
  }): Observable<TareaAgenda[]> {
    return this.http.post(`${this.apiUrl}/insertarTarea`, tarea).pipe(
      switchMap(() => this.cargarTareas())
    );
  }

  modificarTarea(
    id: number,
    tarea: {
      titulo: string;
      descripcion?: string;
      expediente: number;
      novedad?: number | null;
      usuario_completado?: number | null;
      prioridad: number;
      estado_tarea: number;
      fecha_vencimiento?: string | null;
      hora?: string | null;
    }
  ): Observable<TareaAgenda[]> {
    return this.http.put(`${this.apiUrl}/tarea/${id}`, tarea).pipe(
      switchMap(() => this.cargarTareas())
    );
  }

  eliminarTarea(id: number): Observable<TareaAgenda[]> {
    return this.http.delete(`${this.apiUrl}/tarea/${id}`).pipe(
      switchMap(() => this.cargarTareas())
    );
  }

  marcarCumplida(id: number): Observable<TareaAgenda[]> {
    const tarea = this.tareasSubject.value.find((t) => t.id === id);

    if (!tarea) {
      throw new Error(`No existe una tarea cargada con id ${id}`);
    }

    const estadoCumplida = this.estadosTarea.find((estado) => estado.nombre === 'Cumplido');

    if (!estadoCumplida) {
      throw new Error('No se encontró el estado "Cumplido". Revisá la tabla estadotarea.');
    }

    return this.modificarTarea(id, {
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      expediente: tarea.expedienteId,
      novedad: tarea.novedadId,
      usuario_completado: 1,
      prioridad: tarea.prioridadId,
      estado_tarea: estadoCumplida.id,
      fecha_vencimiento: tarea.fecha,
      hora: tarea.hora || null,
    });
  }

  desmarcarCumplida(id: number): Observable<TareaAgenda[]> {
    const tarea = this.tareasSubject.value.find((t) => t.id === id);

    if (!tarea) {
      throw new Error(`No existe una tarea cargada con id ${id}`);
    }

    const estadoPendiente = this.estadosTarea.find((estado) => estado.nombre === 'Pendiente');

    if (!estadoPendiente) {
      throw new Error('No se encontró el estado "Pendiente". Revisá la tabla estadotarea.');
    }

    return this.modificarTarea(id, {
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      expediente: tarea.expedienteId,
      novedad: tarea.novedadId,
      usuario_completado: null,
      prioridad: tarea.prioridadId,
      estado_tarea: estadoPendiente.id,
      fecha_vencimiento: tarea.fecha,
      hora: tarea.hora || null,
    });
  }

  private mapearTarea(tarea: TareaBackend): TareaAgenda {
    const fecha = tarea.fecha_vencimiento
      ? tarea.fecha_vencimiento.substring(0, 10)
      : tarea.fecha_creacion.substring(0, 10);

    const estadoCalculado = this.calcularEstado(tarea.nombre_estado_tarea, fecha);

    return {
      id: tarea.id,

      expedienteId: tarea.expediente,
      novedadId: tarea.novedad,
      prioridadId: tarea.prioridad,
      estadoTareaId: tarea.estado_tarea,
      usuarioCreacionId: tarea.usuario_creacion,
      usuarioCompletadoId: tarea.usuario_completado,

      fecha,
      hora: tarea.hora ?? '',

      fechaCreacion: tarea.fecha_creacion.substring(0, 10),
      fechaUltimaModificacion: tarea.fecha_ultima_modificacion
        ? tarea.fecha_ultima_modificacion.substring(0, 10)
        : null,

      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',

      expediente: tarea.nombre_expediente || String(tarea.expediente),
      novedad: tarea.titulo_novedad || 'Sin novedad',

      cliente: tarea.nombre_cliente || '',
      responsable: `${tarea.nombre_usuario_creacion || ''} ${tarea.apellido_usuario_creacion || ''}`.trim(),

      usuarioCompletado: tarea.usuario_completado
        ? `${tarea.nombre_usuario_completado || ''} ${tarea.apellido_usuario_completado || ''}`.trim()
        : 'Sin completar',

      area: '',

      prioridad: tarea.nombre_prioridad,
      estado: estadoCalculado,
    };
  }

  private calcularEstado(estadoBackend: EstadoTarea, fecha: string): EstadoTarea {
    if (estadoBackend === 'Cumplido') return 'Cumplido';
    if (estadoBackend === 'En curso') return 'En curso';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaTarea = new Date(`${fecha}T00:00:00`);

    if (estadoBackend === 'Pendiente' && fechaTarea < hoy) {
      return 'Vencida';
    }

    return estadoBackend;
  }
}