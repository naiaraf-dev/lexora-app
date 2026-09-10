import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import { ArchivoChecklist, EstadoTareaChecklist, TareaChecklist } from '../../models/estado.model';

export interface TareaChecklistPayload {
  estado: EstadoTareaChecklist;
  observacion: string;
  fechaVencimiento?: string;
  enviarAgenda: boolean;
  archivosNuevos: File[];
}

/**
 * Formulario de detalle/edición de una tarea del checklist.
 * Se renderiza en dos lugares posibles según el ancho de pantalla (ver estados.html):
 * en un panel lateral fijo (pantallas grandes) o desplegado debajo de la fila (pantallas chicas).
 * Este componente no sabe en cuál de los dos está — es puramente el formulario.
 */
@Component({
  selector: 'app-tarea-checklist-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, UiDateInput, PrimaryBtn],
  templateUrl: './tarea-checklist-detalle.html',
})
export class TareaChecklistDetalle implements OnChanges {
  @Input() tarea!: TareaChecklist;
  @Input() soloLectura = false;
  @Input() estadoNombre = ''; // ej. "INICIO" — se muestra como contexto arriba del título

  @Output() guardar = new EventEmitter<TareaChecklistPayload>();
  @Output() cerrar = new EventEmitter<void>();

  guardando = false;

  form = {
    estado: 'EN_CURSO' as EstadoTareaChecklist,
    observacion: '',
    fechaVencimiento: '',
    enviarAgenda: false,
  };

  archivosExistentes: ArchivoChecklist[] = [];
  archivosNuevos: File[] = [];

  ngOnChanges(): void {
    this.form = {
      estado: this.tarea.estado,
      observacion: this.tarea.observacion,
      fechaVencimiento: this.tarea.fechaVencimiento ?? '',
      enviarAgenda: this.tarea.enviarAgenda,
    };
    this.archivosExistentes = this.tarea.archivos;
    this.archivosNuevos = [];
  }

  seleccionarEstado(valor: EstadoTareaChecklist): void {
    if (this.soloLectura) return;
    this.form.estado = valor;
  }

  /** Hoy en formato ISO, para no permitir cargar una fecha de vencimiento pasada. */
  get hoyIso(): string {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mm}-${dd}`;
  }

  /** El switch de agenda solo tiene sentido si hay fecha de vencimiento; si se borra la fecha, se apaga solo. */
  onFechaVencimientoChange(): void {
    if (!this.form.fechaVencimiento) {
      this.form.enviarAgenda = false;
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.archivosNuevos = [...this.archivosNuevos, ...Array.from(input.files)];
    }
    input.value = '';
  }

  eliminarArchivoNuevo(archivo: File): void {
    this.archivosNuevos = this.archivosNuevos.filter(a => a !== archivo);
  }

  cancelar(): void {
    this.ngOnChanges();
    this.cerrar.emit();
  }

  submit(): void {
    if (this.form.estado === 'EN_CURSO' && !this.form.observacion.trim()) {
      toast.warning('Tip: agregá una observación para que se entienda en qué quedó');
    }

    this.guardando = true;

    this.guardar.emit({
      estado: this.form.estado,
      observacion: this.form.observacion,
      fechaVencimiento: this.form.fechaVencimiento || undefined,
      enviarAgenda: this.form.enviarAgenda,
      archivosNuevos: this.archivosNuevos,
    });

    this.guardando = false;
    this.cerrar.emit();
  }
}