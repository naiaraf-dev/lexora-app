import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { FormsModule } from '@angular/forms';
import { Documento } from '../documentos-table/documentos-table';

/**
 * Modal de alta de documentos.
 * Permite seleccionar un archivo (drag & drop o input), tipo, fecha, descripción
 * y novedad relacionada. Emite el form al padre para que construya el FormData y haga el POST.
 */
@Component({
  selector: 'app-modal-doc-alta',
  standalone: true,
  imports: [UiModal, UiSelect, UiDateInput, PrimaryBtn, FormsModule],
  templateUrl: './modal-doc-alta.html',
})
export class ModalDocAlta {
  @Input() novedadOpciones: { value: string; label: string }[] = [];
  @Input() tipoOptions: { value: string; label: string }[] = [];
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Documento>>();

  open = false; // Controla la visibilidad del modal. Se abre desde el padre via abrir().
  guardando = false; // Indica si hay un guardado en curso para deshabilitar el botón y evitar doble envío.

  /** Estado del formulario de alta con el archivo seleccionado y los campos de metadata. */
  form = {
    nombre: '', 
    tipo: '', 
    fechaDocumento: '',
    relacionadoId: '',
    relacionadoCon: '', 
    descripcion: '', 
    archivo: null as File | null,
  };

  /** Abre el modal desde el componente padre. */
  abrir() { this.open = true; }

  /** Captura el archivo seleccionado desde el input de tipo file. */
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.form.archivo = input.files[0];
  }

  /** Maneja el evento de soltar un archivo (drag & drop). */
  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.form.archivo = file;
  }

  /** Emite el formulario al padre y cierra el modal. */
  submit() {
    this.guardar.emit({ ...this.form });
    this.open = false;
    this.resetForm();
  }

  /** Cierra el modal y resetea el formulario sin guardar. */
  cerrarModal() { 
    this.open = false; 
    this.cerrar.emit(); 
    this.resetForm();
  }

  /** Resetea el formulario a su estado inicial. */
  private resetForm() {
    this.form = { nombre: '', tipo: '', fechaDocumento: '', relacionadoId: '', relacionadoCon: '', descripcion: '', archivo: null };
  }
}