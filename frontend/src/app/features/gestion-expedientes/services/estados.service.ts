import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  EstadoDefinicion, EstadoExpedienteRuntime, EstadoTareaChecklist, TareaChecklist,
} from '../models/estado.model';
import { Auth } from '../../../core/services/auth';

@Injectable({ providedIn: 'root' })
export class EstadosService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private auth = inject(Auth);

  /**
 * Devuelve la definición del flujo (lista ordenada de estados + bifurcaciones)
 * para un tipo de expediente, combinando los nodos con las transiciones reales
 * cargadas en transicion_estado.
 */
  obtenerFlujo(tipoId: number): Observable<EstadoDefinicion[]> {
    return forkJoin({
      estados:      this.http.get<any[]>(`${this.base}/enums/tipoexpediente/${tipoId}/estados`),
      transiciones: this.http.get<any[]>(`${this.base}/enums/tipoexpediente/${tipoId}/transiciones`),
    }).pipe(
      map(({ estados, transiciones }) =>
        estados.map(e => ({
          nombre: e.estadoNombre,
          // Se excluye el atajo directo a FINALIZADO: opcionesAvance() ya lo agrega
          // automáticamente al final de la lista de opciones.
          siguientes: transiciones
            .filter(t => t.estadoOrigenId === e.estadoId && t.estadoDestinoNombre !== 'FINALIZADO')
            .map(t => t.estadoDestinoNombre),
        }))
      )
    );
  }

  /**
 * Devuelve el runtime del expediente: estado actual, historial y tareas del estado actual.
 * Fuentes:
 *   - GET /api/expedientes/:id          → estado actual (estado.nombre)
 *   - GET /api/expedientes/:id/historial → historial de estados
 *   - GET /api/tarea?expediente=:id      → tareas automáticas del estado actual
 */
  obtenerEstadoActual(expedienteId: number, tipoId: number): Observable<EstadoExpedienteRuntime> {
    return forkJoin({
      expediente: this.http.get<any>(`${this.base}/expedientes/${expedienteId}`),
      historial:  this.http.get<any[]>(`${this.base}/expedientes/${expedienteId}/historial`),
      tareas:     this.http.get<any[]>(`${this.base}/tarea?expediente=${expedienteId}`),
    }).pipe(
      map(({ expediente, historial, tareas }) => {
        const estadoActual = expediente.estado?.nombre ?? '';
        const archivado    = estadoActual === 'FINALIZADO';

        const historialOrdenado = [...historial].sort((a, b) =>
          new Date(a.fechaCambioEstado).getTime() - new Date(b.fechaCambioEstado).getTime()
        );

        // El back genera las tareas del estado ANTES de registrar el historial de ese
        // mismo estado (por eso fecha_creacion de la tarea queda unos ms antes que
        // fechaCambioEstado). Por eso cada bucket toma como límite superior su propio
        // timestamp de historial, y como límite inferior el timestamp del historial anterior.
        const historialMapeado = historialOrdenado.map((h, i) => {
          const hasta = new Date(h.fechaCambioEstado).getTime();
          const desde = i === 0 ? -Infinity : new Date(historialOrdenado[i - 1].fechaCambioEstado).getTime();

          const tareasDelEstado = tareas.filter((t: any) => {
            if (!t.automatica) return false;
            const creada = new Date(t.fecha_creacion).getTime();
            return i === 0 ? creada <= hasta : creada > desde && creada <= hasta;
          });

          return {
            nombre: h.estado.nombre,
            tareas: tareasDelEstado.map((t: any) => this.mapearTarea(t)),
          };
        });

        if (historialMapeado.length === 0) {
          historialMapeado.push({ nombre: estadoActual, tareas: [] });
        }

        return {
          claveFlujo:   String(tipoId),
          estadoActual,
          archivado,
          historial: historialMapeado,
        } as EstadoExpedienteRuntime;
      })
    );
  }

  private mapearTarea(t: any): TareaChecklist {
    return {
      id:               String(t.id),
      descripcion:      t.titulo,
      estado:           this.mapearEstadoTarea(t.nombre_estado_tarea),
      observacion:      t.descripcion ?? '',
      fechaRegistro:    t.fecha_ultima_modificacion ?? t.fecha_creacion,
      fechaVencimiento: t.fecha_vencimiento ? t.fecha_vencimiento.slice(0, 10) : undefined,
      enviarAgenda:     t.enviar_agenda ?? false,
      archivos:         [],
    };
  }

  private mapearEstadoTarea(nombre: string): EstadoTareaChecklist {
    if (nombre === 'Cumplido')      return 'COMPLETADO';
    if (nombre === 'No procedente') return 'NO_PROCEDENTE';
    return 'EN_CURSO'; // Pendiente o Vencido
  }

  /**
 * Actualiza el estado y observación de una tarea del checklist.
 * Fuente: PUT /api/tarea/:id
 * El back espera: titulo, expediente, prioridad, estado_tarea, descripcion
 */
  actualizarTarea(
    expedienteId: number,
    tareaId: string,
    cambios: Partial<Pick<TareaChecklist, 'estado' | 'observacion' | 'fechaVencimiento' | 'enviarAgenda'>>,
  ): Observable<TareaChecklist> {
    const conEstados$ = this.estadosTareaCache.length
      ? of(this.estadosTareaCache)
      : this.cargarEstadosTarea();

    return conEstados$.pipe(
      switchMap(() => this.http.get<any[]>(`${this.base}/tarea?expediente=${expedienteId}`)),
      switchMap(tareas => {
        const tarea = tareas.find((t: any) => String(t.id) === tareaId);
        if (!tarea) throw new Error('Tarea no encontrada');

        const estadoId = this.mapearEstadoTareaId(cambios.estado ?? 'EN_CURSO');

        return this.http.put<any>(`${this.base}/tarea/${tareaId}`, {
          titulo:            tarea.titulo,
          descripcion:       cambios.observacion ?? tarea.descripcion ?? '',
          expediente:        expedienteId,
          novedad:           tarea.novedad ?? null,
          prioridad:         tarea.prioridad,
          estado_tarea:      estadoId,
          fecha_vencimiento: cambios.fechaVencimiento || tarea.fecha_vencimiento || null,
          hora:              tarea.hora || null,
          enviar_agenda:     cambios.enviarAgenda ?? tarea.enviar_agenda ?? false,
        }).pipe(
          map(() => ({
            id:               tareaId,
            descripcion:      tarea.titulo,
            estado:           cambios.estado ?? 'EN_CURSO',
            observacion:      cambios.observacion ?? '',
            fechaRegistro:    new Date().toISOString(),
            fechaVencimiento: cambios.fechaVencimiento,
            enviarAgenda:     cambios.enviarAgenda ?? false,
            archivos:         [],
          } as TareaChecklist))
        );
      })
    );
  }

  private estadosTareaCache: { id: number; nombre: string }[] = [];

  private cargarEstadosTarea(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/enums/estadotarea`).pipe(
      tap(estados => this.estadosTareaCache = estados)
    );
  }

  private mapearEstadoTareaId(estado: EstadoTareaChecklist): number {
    const nombreBuscado =
      estado === 'COMPLETADO'    ? 'Cumplido' :
      estado === 'NO_PROCEDENTE' ? 'No procedente' :
      'Pendiente';

    return this.estadosTareaCache.find(e => e.nombre === nombreBuscado)?.id ?? 1;
  }

  /**
 * Avanza el expediente al siguiente estado.
 * Envía estado_origen para que el back valide la transición contra transicion_estado.
 */
  avanzarEstado(expedienteId: number, siguienteEstadoNombre: string, estadoActualId: number): Observable<void> {
    return this.http.get<any[]>(`${this.base}/enums/estadoexpediente`).pipe(
      switchMap(estados => {
        const estado = estados.find((e: any) =>
          e.nombre.toUpperCase() === siguienteEstadoNombre.toUpperCase()
        );
        if (!estado) throw new Error(`Estado "${siguienteEstadoNombre}" no encontrado`);

        return this.http.put<any>(`${this.base}/expedientes/${expedienteId}`, {
          estado_expediente:       estado.id,
          estado_origen:           estadoActualId,
          usuario_creacion_tareas: this.auth.currentUser()?.id ?? 1,
        });
      }),
      map(() => void 0)
    );
  }
}