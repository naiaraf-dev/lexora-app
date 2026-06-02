import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { Novedad, TareaAsociada } from '../novedades-card/novedades-card';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-modal-novedad',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-novedad.html',
})
export class ModalNovedad implements OnChanges {
  @Input() open = false;
  @Input() novedad: Novedad | null = null; // null = alta, valor = editar
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Novedad>>();

  guardando = false;
  crearTarea = true; // checkbox "Crear tarea / plazo asociado"
  archivosAdjuntos: File[] = [];

  form = {
    tipo: '',
    fechaActuacion: '',
    titulo: '',
    descripcion: '',
  };

  // Sub-form de tarea
  // 🗓️ AGENDA — estos campos alimentan la tarea que se sincronizará con la agenda
  tareaForm = {
    titulo: '',
    prioridad: '',
    fechaVencimiento: '',
    hora: '',
    responsable: '',
    descripcionInstrucciones: '',
  };

  tipoOptions = [
    { value: 'PRESENTACION', label: 'Presentación' },
    { value: 'AUDIENCIA',    label: 'Audiencia' },
    { value: 'RESOLUCION',   label: 'Resolución' },
    { value: 'OFICIO',       label: 'Oficio' },
    { value: 'PERICIA',      label: 'Pericia' },
    { value: 'NOTIFICACION', label: 'Notificación' },
    { value: 'OTRO',         label: 'Otro' },
  ];

  prioridadOptions = [
    { value: 'ALTA',  label: 'Alta' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'BAJA',  label: 'Baja' },
  ];

  get modoEdicion(): boolean { return !!this.novedad; }
  get titulo(): string { return this.modoEdicion ? 'Editar Novedad' : 'Nueva Novedad'; }
  get labelGuardar(): string { return this.modoEdicion ? 'Guardar cambios' : 'Guardar novedad'; }

  ngOnChanges() {
    if (this.novedad) {
      this.form = {
        tipo:             this.novedad.tipo,
        fechaActuacion:   this.novedad.fechaActuacion,
        titulo:           this.novedad.titulo,
        descripcion:      this.novedad.descripcion,
      };
      if (this.novedad.tarea) {
        this.crearTarea = true;
        this.tareaForm = {
          titulo:                  this.novedad.tarea.titulo,
          prioridad:               this.novedad.tarea.prioridad,
          fechaVencimiento:        this.novedad.tarea.fechaVencimiento,
          hora:                    this.novedad.tarea.hora ?? '',
          responsable:             this.novedad.tarea.responsable,
          descripcionInstrucciones: this.novedad.tarea.descripcionInstrucciones,
        };
      } else {
        this.crearTarea = false;
        this.resetTareaForm();
      }
    } else {
      this.resetForm();
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.archivosAdjuntos = Array.from(input.files);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.archivosAdjuntos = [...this.archivosAdjuntos, ...Array.from(event.dataTransfer.files)];
    }
  }

  submit() {
    if (!this.form.tipo || !this.form.titulo || !this.form.fechaActuacion) {
      toast.error('Completá los campos obligatorios');
      return;
    }

    this.guardando = true;

    // 🗓️ AGENDA — cuando se integre el módulo de agenda, además del emit de guardar,
    // acá se deberá llamar al AgendaService para crear/actualizar el evento correspondiente:
    //
    // if (this.crearTarea && this.tareaForm.titulo) {
    //   this.agendaService.crearEvento({
    //     titulo: this.tareaForm.titulo,
    //     fechaVencimiento: this.tareaForm.fechaVencimiento,
    //     hora: this.tareaForm.hora,
    //     prioridad: this.tareaForm.prioridad,
    //     responsable: this.tareaForm.responsable,
    //     instrucciones: this.tareaForm.descripcionInstrucciones,
    //     expedienteId: <id del expediente actual>,
    //     novedadId: <id de la novedad>,
    //   }).subscribe(evento => {
    //     tarea.agendaEventId = evento.id;
    //   });
    // }

    const tarea: TareaAsociada | undefined = this.crearTarea && this.tareaForm.titulo
      ? {
          id:                      crypto.randomUUID(),
          titulo:                  this.tareaForm.titulo,
          prioridad:               this.tareaForm.prioridad as any,
          fechaVencimiento:        this.tareaForm.fechaVencimiento,
          hora:                    this.tareaForm.hora,
          responsable:             this.tareaForm.responsable,
          descripcionInstrucciones: this.tareaForm.descripcionInstrucciones,
          cumplida:                false,
        }
      : undefined;

    const payload: Partial<Novedad> = {
      ...this.form,
      archivos: this.archivosAdjuntos.map(f => ({ nombre: f.name, url: '#' })),
      tarea,
    };

    // 🔴 MOCK — reemplazar por servicio
    setTimeout(() => {
      this.guardando = false;
      this.guardar.emit(payload);
      this.cerrar.emit();
      this.resetForm();
    }, 800);
  }

  cerrarModal() { this.cerrar.emit(); this.resetForm(); }

  private resetForm() {
    this.form = { tipo: '', fechaActuacion: '', titulo: '', descripcion: '' };
    this.archivosAdjuntos = [];
    this.crearTarea = true;
    this.resetTareaForm();
  }

  private resetTareaForm() {
    this.tareaForm = { titulo: '', prioridad: '', fechaVencimiento: '', hora: '', responsable: '', descripcionInstrucciones: '' };
  }
}