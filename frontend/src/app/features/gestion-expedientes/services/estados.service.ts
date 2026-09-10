import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  EstadoDefinicion, EstadoExpedienteRuntime, EstadoTareaChecklist, TareaChecklist,
} from '../models/estado.model';
import { FLUJOS_POR_TIPO, crearTareasIniciales, resolverClaveFlujo } from '../models/estados-flujos.mock.data';

/**
 * Servicio del módulo de Estados.
 * 🔴 MOCK — Todos los métodos hoy trabajan contra un Map en memoria (dura mientras
 * el usuario no recarga la página). Cuando el back esté listo (HU07, HU10-HU13),
 * cada método pasa a hacer this.http.get/post/put contra /api/expedientes/:id/estados,
 * manteniendo la misma firma para no tener que tocar el componente.
 */
@Injectable({ providedIn: 'root' })
export class EstadosService {

  private runtimePorExpediente = new Map<number, EstadoExpedienteRuntime>();

  /** Devuelve la definición completa del flujo (lista de estados posibles) para un tipo de expediente. */
  obtenerFlujo(tipoNombre: string): Observable<EstadoDefinicion[]> {
    const clave = resolverClaveFlujo(tipoNombre);
    return of(FLUJOS_POR_TIPO[clave]).pipe(delay(150));
  }

  /** Devuelve el estado runtime del expediente (estado actual, historial, archivado). Lo inicializa si es la primera vez. */
  obtenerEstadoActual(expedienteId: number, tipoNombre: string): Observable<EstadoExpedienteRuntime> {
    if (!this.runtimePorExpediente.has(expedienteId)) {
      const clave = resolverClaveFlujo(tipoNombre);
      const flujo = FLUJOS_POR_TIPO[clave];
      const primerEstado = flujo[0].nombre;

      this.runtimePorExpediente.set(expedienteId, {
        claveFlujo: clave,
        estadoActual: primerEstado,
        archivado: false,
        historial: [{ nombre: primerEstado, tareas: crearTareasIniciales(primerEstado) }],
      });
    }

    return of(this.runtimePorExpediente.get(expedienteId)!).pipe(delay(150));
  }

  /** Actualiza una tarea puntual del checklist (estado, observación, fecha vencimiento, agenda). */
  actualizarTarea(
    expedienteId: number,
    tareaId: string,
    cambios: Partial<Pick<TareaChecklist, 'estado' | 'observacion' | 'fechaVencimiento' | 'enviarAgenda'>>,
  ): Observable<TareaChecklist> {
    const runtime = this.runtimePorExpediente.get(expedienteId);
    const estadoActual = runtime?.historial.find(h => h.nombre === runtime.estadoActual);
    const tarea = estadoActual?.tareas.find(t => t.id === tareaId);

    if (!tarea) throw new Error('Tarea de checklist no encontrada');

    Object.assign(tarea, cambios, { fechaRegistro: new Date().toISOString() });

    return of(tarea).pipe(delay(150));
  }

    /** Avanza el expediente al estado elegido por el usuario (incluye la opción 'FINALIZADO' desde cualquier estado). */
  avanzarEstado(expedienteId: number, siguienteEstado: string): Observable<void> {
    const runtime = this.runtimePorExpediente.get(expedienteId);
    if (!runtime) throw new Error('Expediente sin estado inicializado');

    runtime.estadoActual = siguienteEstado;
    runtime.historial.push({ nombre: siguienteEstado, tareas: crearTareasIniciales(siguienteEstado) });

    if (siguienteEstado === 'FINALIZADO') {
      runtime.archivado = true;
    }

    return of(void 0).pipe(delay(150));
  }

  /** Desarchiva el expediente para permitir editarlo nuevamente. */
  desarchivar(expedienteId: number): Observable<void> {
    const runtime = this.runtimePorExpediente.get(expedienteId);
    if (runtime) runtime.archivado = false;
    return of(void 0).pipe(delay(150));
  }

  /** Vuelve a archivar el expediente tras haberlo editado estando desarchivado. */
  volverAFinalizar(expedienteId: number): Observable<void> {
    const runtime = this.runtimePorExpediente.get(expedienteId);
    if (runtime) runtime.archivado = true;
    return of(void 0).pipe(delay(150));
  }
}