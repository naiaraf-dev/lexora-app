import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { DocumentosFilters, DocumentoFilterState } from '../documentos-filters/documentos-filters';
import { DocumentosTable, Documento } from '../documentos-table/documentos-table';
import { ModalDocAlta } from '../modal-doc-alta/modal-doc-alta';
import { ModalDocEdit } from '../modal-doc-edit/modal-doc-edit';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';

/**
 * Sub-página de documentos adjuntos de un expediente.
 * Carga documentos, novedades (adjunto asociado a una novedad) y tipos de documento desde el backend.
 * Gestiona el alta (subida de archivo), edición, eliminación y descarga de documentos.
 */
@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DocumentosFilters, DocumentosTable, ModalDocAlta, ModalDocEdit, PrimaryBtn, UiConfirmModal],
  templateUrl: './documentos.html',
})
export class Documentos implements OnInit {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);
  private expedienteId!: number;

  allDocumentos: Documento[] = []; // Lista completa de documentos del expediente cargados desde el backend.

  novedadOpciones: { value: string; label: string }[] = []; // Opciones de novedades del expediente para asociar un documento a una novedad.

  tipoDocumentoOptions: { value: string; label: string }[] = []; // Opciones de tipo de documento cargadas desde /api/enums/tipodocumento.

  /** Mapa de clave normalizada → id numérico del tipo de documento, usado al enviar el POST/PUT. */
  private tipoIdMap: Record<string, number> = {};

  /** Filtros activos aplicados sobre la lista de documentos. */
  activeFilters: DocumentoFilterState = { nombre: '', tipo: '' };

  pageSize = 10;
  currentPage = 1;

  modalAltaRef: any; // Referencia al modal de alta para poder abrirlo desde el template via abrir().
  modalEditOpen = false; // Controla la visibilidad del modal de edición.

  /** Documento seleccionado para edición. Null cuando no hay edición activa. */
  selectedDoc: Documento | null = null;

  /** Documento seleccionado para eliminar. Controla la apertura del modal de confirmación. */
  docAEliminar: Documento | null = null;

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));
    this.cargarDocumentos();
    this.cargarNovedadesOpciones();
    this.cargarTiposDocumento();
  }

  /** Lista de documentos filtrada según nombre y tipo activos. */
  get filteredDocumentos(): Documento[] {
    const f = this.activeFilters;

    return this.allDocumentos.filter(d =>
      (!f.nombre || d.nombre.toLowerCase().includes(f.nombre.toLowerCase())) &&
      (!f.tipo   || d.tipo === f.tipo)
    );
  }

  /** Total de páginas calculado sobre la lista filtrada. */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDocumentos.length / this.pageSize));
  }

  /** Slice de la lista filtrada correspondiente a la página actual. */
  get pagedDocumentos(): Documento[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  /** Mensaje dinámico del modal de confirmación con el nombre del documento a eliminar. */
  get mensajeConfirmarEliminar(): string {
    return `¿Estás seguro que querés eliminar "${this.docAEliminar?.nombre}"? Esta acción no se puede deshacer.`;
  }

  /** Obtiene los documentos del expediente desde el backend y los mapea al modelo Documento. */
  private cargarDocumentos(): void {
    this.http.get<any[]>(`${environment.apiUrl}/documento?expediente=${this.expedienteId}`)
      .subscribe({
        next: (res) => {
          this.allDocumentos = res.map(d => this.mapDocumento(d));
          this.cdr.detectChanges();
        },
        error: () => toast.error('Error al cargar documentos'),
      });
  }

  /** Carga las novedades del expediente para usarlas como opciones en el selector de relación. */
  private cargarNovedadesOpciones(): void {
    this.http.get<any[]>(`${environment.apiUrl}/expedientes/${this.expedienteId}/novedades`)
      .subscribe({
        next: (res) => {
          this.novedadOpciones = res.map(n => ({
            value: String(n.id),
            label: n.titulo,
          }));
        },
        error: () => toast.error('Error al cargar novedades'),
      });
  }

  /** Carga los tipos de documento y construye el mapa de clave normalizada → id. */
  private cargarTiposDocumento(): void {
    this.http.get<any[]>(`${environment.apiUrl}/enums/tipodocumento`).subscribe({
      next: (res) => {
        this.tipoDocumentoOptions = res.map(t => ({
          value: t.nombre.toUpperCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          label: t.nombre,
        }));
        this.tipoIdMap = Object.fromEntries(
          res.map(t => [t.nombre.toUpperCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''), t.id])
        );
        this.cdr.detectChanges();
      }
    });
  }

  /** Normaliza el nombre de un tipo de documento a clave sin tildes, espacios ni minúsculas para comparación. */
  private normalizarTipoDocumento(nombre: string): string {
    return nombre
      .toUpperCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Mapea un objeto crudo del backend al modelo Documento usado en el frontend. */
  private mapDocumento(d: any): Documento {
    return {
      id:             String(d.id),
      nombre:         d.nombre_archivo,
      tipo: d.nombre_tipo_documento
        ? this.normalizarTipoDocumento(d.nombre_tipo_documento)
        : '',
      tipoLabel:      d.nombre_tipo_documento ?? '',
      relacionadoCon: d.titulo_novedad ? `Novedad: ${d.titulo_novedad}` : '—',
      relacionadoId:  d.novedad ? String(d.novedad) : '',
      fechaCarga:     d.fecha_creacion,
      tamanio:        '—',
      descripcion:    d.descripcion ?? '',
      fechaDocumento: d.fecha_documento ? String(d.fecha_documento).slice(0, 10) : '',
      url:            d.storage_key ?? '#',
    };
  }

  /** Actualiza los filtros activos y resetea a la primera página. */
  onFiltersChange(f: DocumentoFilterState): void {
    this.activeFilters = f;
    this.currentPage = 1;
  }

  /** Selecciona el documento a editar y abre el modal de edición. */
  onEdit(doc: Documento): void {
    this.selectedDoc = doc;
    this.modalEditOpen = true;
  }

  /** Selecciona el documento a eliminar y abre el modal de confirmación. */
  onDelete(doc: Documento): void {
    this.docAEliminar = doc;
  }

  /** Llama al endpoint de eliminación y actualiza la lista local si el borrado es exitoso. */
  confirmarEliminar(): void {
    if (!this.docAEliminar) return;

    this.http.delete<any>(`${environment.apiUrl}/documento/${this.docAEliminar.id}`)
      .subscribe({
        next: () => {
          this.allDocumentos = this.allDocumentos.filter(d => d.id !== this.docAEliminar!.id);
          this.docAEliminar = null;
          toast.success('Documento eliminado');
          this.cdr.detectChanges();
        },
        error: (err) => toast.error(err?.error?.mensaje ?? 'Error al eliminar el documento'),
      });
  }

  /** Construye el FormData con el archivo y metadata, y lo envía al endpoint de subida. */
  onGuardarAlta(formData: any): void {
    if (!formData.archivo) {
      toast.error('Seleccioná un archivo');
      return;
    }

    if (!formData.tipo) {
      toast.error('Seleccioná un tipo de documento');
      return;
    }

    const tipoDocumentoId = this.tipoIdMap[formData.tipo] ?? this.tipoIdMap['OTRO'];

    if (!tipoDocumentoId) {
      toast.error('No se encontró el tipo de documento seleccionado');
      return;
    }

    const fd = new FormData();
    fd.append('archivo',          formData.archivo);
    fd.append('expediente',       String(this.expedienteId));
    fd.append('tipo_documento',   String(tipoDocumentoId));
    fd.append('usuario_creacion', '1');

    if (formData.descripcion) {
      fd.append('descripcion', formData.descripcion);
    }

    if (formData.fechaDocumento) {
      fd.append('fecha_documento', formData.fechaDocumento);
    }

    if (formData.relacionadoId) {
      fd.append('novedad', formData.relacionadoId);
    }

    this.http.post<any>(`${environment.apiUrl}/subirDocumento`, fd)
      .subscribe({
        next: () => {
          this.cargarDocumentos();
          toast.success('Documento subido correctamente');
        },
        error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al subir el documento'),
      });
  }

  /** Construye el FormData con los campos editados y lo envía al endpoint de actualización. */
  onGuardarEdit(changes: Partial<Documento>): void {
    if (!this.selectedDoc) return;

    const fd = new FormData();
    fd.append('idexpediente', String(this.expedienteId));

    if (changes.tipo) {
      const tipoId = this.tipoIdMap[changes.tipo];
      if (tipoId) fd.append('tipo_documento', String(tipoId));
    }

    if (changes.descripcion) {
      fd.append('descripcion', changes.descripcion);
    }

    if (changes.fechaDocumento) {
      fd.append('fecha_documento', changes.fechaDocumento);
    }

    if (changes.relacionadoId) {
      fd.append('novedad', changes.relacionadoId);
    }

    this.http.put<any>(`${environment.apiUrl}/documento/${this.selectedDoc.id}`, fd)
      .subscribe({
        next: () => {
          this.cargarDocumentos();
          this.selectedDoc = null;
          this.modalEditOpen = false;
          toast.success('Documento actualizado correctamente');
        },
        error: (err) => toast.error(err?.error?.mensaje ?? 'Error al actualizar el documento'),
      });
  }

  /** Abre el documento en una nueva pestaña usando el endpoint de descarga por ID. */
  onDownload(doc: Documento): void {
    if (!doc.id) {
      toast.error('Documento sin ID');
      return;
    }

    window.open(`${environment.apiUrl}/documento/${doc.id}/descargar`, '_blank');
  }

  /** Retorna a la página de gestión de expedientes. */
  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}