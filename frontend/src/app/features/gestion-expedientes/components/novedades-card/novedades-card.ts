import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TareaAsociada {
  id: string;
  titulo: string;
  fechaVencimiento: string; // ISO
  hora?: string;
  prioridad: string;
  responsable: string;
  descripcionInstrucciones: string;
  cumplida: boolean;

  // 🗓️ AGENDA — estos campos se usarán para sincronizar con el módulo de agenda
  // cuando se integre. La tarea se crea acá y se consume allá.
  // agendaEventId?: string;  // ID del evento creado en la agenda (a poblar al conectar)
}

export interface Novedad {
  id: string;
  tipo: string;        // código: 'PRESENTACION', 'AUDIENCIA', etc.
  tipoLabel: string;
  fechaActuacion: string;   // ISO
  titulo: string;
  descripcion: string;
  responsable: string;
  archivos: { nombre: string; url: string }[];
  etapaRelacionada?: string;
  tarea?: TareaAsociada;    // opcional — novedad puede no tener tarea
}

// Badge config por tipo de novedad
export const NOVEDAD_BADGE: Record<string, { label: string; classes: string }> = {
  Audiencia:     { label: 'Audiencia',     classes: 'bg-yellow-100 text-yellow-700' },
  Presentación:  { label: 'Presentación',  classes: 'bg-blue-100 text-blue-600' },
  Notificación:  { label: 'Notificación',  classes: 'bg-orange-100 text-orange-600' },
  Vencimiento:   { label: 'Vencimiento',   classes: 'bg-red-100 text-red-600' },
  Llamada:       { label: 'Llamada',       classes: 'bg-green-100 text-green-700' },
  Reunión:       { label: 'Reunión',       classes: 'bg-purple-100 text-purple-600' },
  Observación:   { label: 'Observación',   classes: 'bg-gray-100 text-gray-500' },
};

@Component({
  selector: 'app-novedades-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './novedades-card.html',
})
export class NovedadesCard {
  @Input() novedad!: Novedad;
  @Input() numero!: number;
  @Output() editar   = new EventEmitter<Novedad>();
  @Output() eliminar = new EventEmitter<Novedad>();

  get badge() {
    return NOVEDAD_BADGE[this.novedad.tipoLabel] ?? { label: this.novedad.tipoLabel, classes: 'bg-gray-100 text-gray-500' };
  }

  get prioridadClasses(): string {
    const map: Record<string, string> = {
      Alta:    'bg-red-100 text-red-600',
      Media:   'bg-yellow-100 text-yellow-700',
      Baja:    'bg-green-100 text-green-700',
      Urgente: 'bg-rose-100 text-rose-700',
    };
    return this.novedad.tarea ? (map[this.novedad.tarea.prioridad] ?? '') : '';
  }
}