/**
 * Modelos del módulo de Estados del expediente.
 * El checklist de tareas de cada estado tiene 3 posibles valores:
 * EN_CURSO bloquea el avance automático de estado, COMPLETADO y NO_PROCEDENTE no lo bloquean.
 */

export type EstadoTareaChecklist = 'EN_CURSO' | 'COMPLETADO' | 'NO_PROCEDENTE';

export interface ArchivoChecklist {
  id?: string;
  nombre: string;
  url: string;
}

export interface TareaChecklist {
  id: string;
  descripcion: string;
  estado: EstadoTareaChecklist;
  observacion: string;
  fechaRegistro: string;        // se pisa automáticamente en cada actualización de la tarea
  fechaVencimiento?: string;    // opcional
  enviarAgenda: boolean;        // solo puede activarse si hay fechaVencimiento cargada
  archivos: ArchivoChecklist[];
}

/** Definición estática de un estado dentro de un flujo (no depende del expediente puntual). */
export interface EstadoDefinicion {
  nombre: string;
  siguientes: string[];   // [] = estado terminal | [x] = lineal | [x, y, ...] = bifurcación
}

/** Estado ya transitado (o el actual) por un expediente puntual, con sus tareas y su progreso real. */
export interface EstadoRegistrado {
  nombre: string;
  tareas: TareaChecklist[];
}

/** Estado runtime completo de un expediente: en qué flujo está, en qué estado actual, y su historial. */
export interface EstadoExpedienteRuntime {
  claveFlujo: string;
  estadoActual: string;
  archivado: boolean;
  historial: EstadoRegistrado[]; // orden cronológico, el último es el estado actual
}

/** Config visual de cada estado de tarea, para usar en badges (mismo patrón que NOVEDAD_BADGE). */
export const ESTADO_TAREA_BADGE: Record<EstadoTareaChecklist, { label: string; classes: string }> = {
  EN_CURSO:       { label: 'En curso',       classes: 'bg-yellow-100 text-yellow-700' },
  COMPLETADO:     { label: 'Completado',     classes: 'bg-green-100 text-green-700' },
  NO_PROCEDENTE:  { label: 'No procedente',  classes: 'bg-gray-100 text-gray-500' },
};

export const ESTADO_TAREA_OPTIONS: { value: EstadoTareaChecklist; label: string }[] = [
  { value: 'EN_CURSO',      label: 'En curso' },
  { value: 'COMPLETADO',    label: 'Completado' },
  { value: 'NO_PROCEDENTE', label: 'No procedente' },
];