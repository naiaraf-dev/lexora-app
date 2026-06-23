import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { Novedad, TareaAsociada } from '../novedades-card/novedades-card';
import { toast } from 'ngx-sonner';
import { environment } from '../../../../../environments/environment.prod';
import { HttpClient } from '@angular/common/http';

export interface DocumentoAdjuntoNovedad {
  id: string;
  nombre: string;
  tipo: string;
  fechaDocumento: string;
  descripcion: string;
  archivo: File;
}

export type NovedadPayloadConDocumentos = Partial<Novedad> & {
  documentosAdjuntos?: DocumentoAdjuntoNovedad[];
};

/**
 * Modal de alta y edición de novedades.
 * Soporta adjuntar documentos, el cual se refleja en Documentos.
 * Permite crear una tarea/plazo asociado a la novedad.
 * Emite el payload completo al padre incluyendo documentos adjuntos y tarea.
 */
@Component({
  selector: 'app-modal-novedad',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-novedad.html',
})
export class ModalNovedad implements OnChanges {
  @Input() open = false;
  @Input() novedad: Novedad | null = null; // null = alta, valor = editar

  @Input() tipoOptions: { value: string; label: string }[] = [];
  @Input() prioridadOptions: { value: string; label: string }[] = [];
  @Input() usuarioOptions: { value: string; label: string }[] = [];

  // Tipos de documento para los archivos que se adjuntan desde la novedad
  @Input() tipoDocumentoOptions: { value: string; label: string }[] = [];

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<NovedadPayloadConDocumentos>();

  private http = inject(HttpClient);

  guardando = false; // Indica si hay un guardado en curso para deshabilitar el botón y evitar doble envío.
  crearTarea = true; // checkbox "Crear tarea / plazo asociado"

  /** Lista de documentos nuevos seleccionados por el usuario para subir junto a la novedad. */
  documentosAdjuntos: DocumentoAdjuntoNovedad[] = [];

  /** Archivos ya adjuntos a la novedad en edición, cargados desde el backend. */
  archivosExistentes: { id?: string; nombre: string; url: string }[] = [];

  /** Estado del formulario principal de la novedad (tipo, fecha, título, descripción). */
  form = {
    tipo: '',
    fechaActuacion: '',
    titulo: '',
    descripcion: '',
  };

  /** Sub-form de la tarea/plazo asociado. Se sincroniza con el módulo de agenda cuando esté disponible. */
  tareaForm = {
    titulo: '',
    prioridad: '',
    fechaVencimiento: '',
    hora: '',
    responsable: '',
    descripcionInstrucciones: '',
  };

  /** Retorna true si el modal fue abierto con una novedad existente (edición) o false si es alta. */
  get modoEdicion(): boolean {
    return !!this.novedad;
  }

  /** Retorna el título del modal según si es modo de edición o alta. */
  get titulo(): string {
    return this.modoEdicion ? 'Editar Novedad' : 'Nueva Novedad';
  }

  /** Retorna el label del botón de guardar según si es modo de edición o alta. */
  get labelGuardar(): string {
    return this.modoEdicion ? 'Guardar cambios' : 'Guardar novedad';
  }

  /** Parchea el formulario con los datos de la novedad al abrir en modo edición, o resetea si es alta. */
  ngOnChanges() {
    if (this.novedad) {
      this.form = {
        tipo: this.novedad.tipo,
        fechaActuacion: this.novedad.fechaActuacion
          ? new Date(this.novedad.fechaActuacion).toISOString().slice(0, 10)
          : '',
        titulo: this.novedad.titulo,
        descripcion: this.novedad.descripcion,
      };

      this.archivosExistentes = this.novedad.archivos ?? [];
      this.documentosAdjuntos = [];

      if (this.novedad.tarea) {
        this.crearTarea = true;
        this.tareaForm = {
          titulo: this.novedad.tarea.titulo,
          prioridad: this.novedad.tarea.prioridad,
          fechaVencimiento: this.novedad.tarea.fechaVencimiento,
          hora: this.novedad.tarea.hora ?? '',
          responsable: this.novedad.tarea.responsable ?? '',
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

  /** Captura los archivos seleccionados desde el input de tipo file y los agrega a documentosAdjuntos. */
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files) {
      this.agregarDocumentos(Array.from(input.files));
    }

    // Permite volver a seleccionar el mismo archivo si lo eliminás y lo querés cargar de nuevo
    input.value = '';
  }

  /** Captura los archivos soltados en la zona de drag & drop y los agrega a documentosAdjuntos. */
  onDrop(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer?.files) {
      this.agregarDocumentos(Array.from(event.dataTransfer.files));
    }
  }

  /** Crea entradas DocumentoAdjuntoNovedad para cada archivo y los suma a la lista de adjuntos. */
  private agregarDocumentos(files: File[]) {
    const nuevosDocumentos: DocumentoAdjuntoNovedad[] = files.map(file => ({
      id: crypto.randomUUID(),
      nombre: file.name,
      tipo: '',
      fechaDocumento: this.form.fechaActuacion || '',
      descripcion: '',
      archivo: file,
    }));

    this.documentosAdjuntos = [
      ...this.documentosAdjuntos,
      ...nuevosDocumentos,
    ];
  }

  /** Elimina un documento de la lista de adjuntos nuevos sin afectar los existentes. */
  eliminarDocumentoAdjunto(documento: DocumentoAdjuntoNovedad): void {
    this.documentosAdjuntos = this.documentosAdjuntos.filter(d => d.id !== documento.id);
  }

  /** Valida el formulario, construye el payload con archivos y tarea, y lo emite al padre. */
  submit() {
    if (!this.form.tipo || !this.form.titulo || !this.form.fechaActuacion) {
      toast.error('Completá los campos obligatorios');
      return;
    }

    const documentoIncompleto = this.documentosAdjuntos.some(doc =>
      !doc.tipo || !doc.fechaDocumento
    );

    if (documentoIncompleto) {
      toast.error('Completá tipo y fecha de cada documento adjunto');
      return;
    }

    this.guardando = true;

    const usuarioSeleccionado = this.usuarioOptions.find(u => u.value === this.tareaForm.responsable);

    const tarea: TareaAsociada | undefined = this.crearTarea && this.tareaForm.titulo
      ? {
          id: crypto.randomUUID(),
          titulo: this.tareaForm.titulo,
          prioridad: this.tareaForm.prioridad as any,
          fechaVencimiento: this.tareaForm.fechaVencimiento,
          hora: this.tareaForm.hora,
          responsable: this.tareaForm.responsable,
          responsableNombre: usuarioSeleccionado?.label ?? '—',
          descripcionInstrucciones: this.tareaForm.descripcionInstrucciones,
          cumplida: false,
        }
      : undefined;

    const payload: NovedadPayloadConDocumentos = {
      ...this.form,

      // Esto sirve para que la card de novedades pueda mostrar los nombres de archivos adjuntos
      archivos: [
        ...this.archivosExistentes,
        ...this.documentosAdjuntos.map(d => ({
          nombre: d.nombre,
          url: '#',
        })),
      ],

      // Esto es lo que usa el padre para subirlos realmente a tabla documentos
      documentosAdjuntos: this.documentosAdjuntos,

      tarea,
    };

    this.guardando = false;
    this.guardar.emit(payload);
    this.cerrar.emit();
    this.resetForm();
  }

  /** Valida el formulario, construye el payload con archivos y tarea, y lo emite al padre. */
  cerrarModal() {
    this.cerrar.emit();
    this.resetForm();
  }

  /** Resetea todos los campos del formulario, adjuntos, tarea y archivos existentes a su estado inicial. */
  private resetForm() {
    this.form = { tipo: '', fechaActuacion: '', titulo: '', descripcion: '' };
    this.documentosAdjuntos = [];
    this.crearTarea = true;
    this.resetTareaForm();
    this.archivosExistentes = [];
  }

  /** Resetea únicamente el sub-form de tarea a sus valores vacíos iniciales. */
  private resetTareaForm() {
    this.tareaForm = {
      titulo: '',
      prioridad: '',
      fechaVencimiento: '',
      hora: '',
      responsable: '',
      descripcionInstrucciones: '',
    };
  }

  /** Elimina un archivo existente de la vista local. */
  eliminarArchivoExistente(archivo: { id?: string; nombre: string; url: string }): void {
    if (!archivo.id) {
      this.archivosExistentes = this.archivosExistentes.filter(a => a.nombre !== archivo.nombre);
      return;
    }

    this.http.delete(`${environment.apiUrl}/documento/${archivo.id}`).subscribe({
      next: () => {
        this.archivosExistentes = this.archivosExistentes.filter(a => a.id !== archivo.id);
      },
      error: () => toast.error('Error al eliminar el archivo')
    });
  }
}