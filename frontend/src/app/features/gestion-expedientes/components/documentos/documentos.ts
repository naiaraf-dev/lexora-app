import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { DocumentosFilters, DocumentoFilterState } from '../documentos-filters/documentos-filters';
import { DocumentosTable, Documento } from '../documentos-table/documentos-table';
import { ModalDocAlta } from '../modal-doc-alta/modal-doc-alta';
import { ModalDocEdit } from '../modal-doc-edit/modal-doc-edit';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DocumentosFilters, DocumentosTable, ModalDocAlta, ModalDocEdit, PrimaryBtn, UiConfirmModal],
  templateUrl: './documentos.html',
})
export class Documentos implements OnInit {
  private http    = inject(HttpClient);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);
  private cdr     = inject(ChangeDetectorRef);
  private expedienteId!: number;

  allDocumentos: Documento[] = [];
  novedadOpciones: { value: string; label: string }[] = [];

  activeFilters: DocumentoFilterState = { nombre: '', tipo: '' };

  get filteredDocumentos(): Documento[] {
    const f = this.activeFilters;
    return this.allDocumentos.filter(d =>
      (!f.nombre || d.nombre.toLowerCase().includes(f.nombre.toLowerCase())) &&
      (!f.tipo   || d.tipo === f.tipo)
    );
  }

  pageSize = 10;
  currentPage = 1;
  get totalPages()     { return Math.max(1, Math.ceil(this.filteredDocumentos.length / this.pageSize)); }
  get pagedDocumentos() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  modalAltaRef: any;
  modalEditOpen = false;
  selectedDoc: Documento | null = null;

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));
    this.cargarDocumentos();
    this.cargarNovedadesOpciones();
    this.cargarTiposDocumento();
  }

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

  private cargarNovedadesOpciones(): void {
    this.http.get<any[]>(`${environment.apiUrl}/expedientes/${this.expedienteId}/novedades`)
      .subscribe({
        next: (res) => {
          this.novedadOpciones = res.map(n => ({ value: String(n.id), label: n.titulo }));
        }
      });
  }

  tipoDocumentoOptions: { value: string; label: string }[] = [];

  private tipoIdMap: Record<string, number> = {};

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
      }
    });
  }

  private mapDocumento(d: any): Documento {
    return {
      id:             String(d.id),
      nombre:         d.nombre_archivo,
      tipo: d.nombre_tipo_documento
        ? d.nombre_tipo_documento
            .toUpperCase()
            .replace(/\s+/g, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
        : '',
      tipoLabel:      d.nombre_tipo_documento ?? '',
      relacionadoCon: d.descripcion_novedad ?? '',
      relacionadoId:  d.novedad ? String(d.novedad) : '',
      fechaCarga:     d.fecha_creacion,
      tamanio:        '—',
      descripcion:    d.descripcion ?? '',
      fechaDocumento: d.fecha_documento ? d.fecha_documento.slice(0, 10) : '',
      url:            d.storage_key ?? '#',
    };
  }

  onFiltersChange(f: DocumentoFilterState) {
    this.activeFilters = f;
    this.currentPage = 1;
  }

  onEdit(doc: Documento) {
    this.selectedDoc = doc;
    this.modalEditOpen = true;
  }

  // Confirmar eliminación de documento
  docAEliminar: Documento | null = null;

  get mensajeConfirmarEliminar(): string {
    return `¿Estás seguro que querés eliminar "${this.docAEliminar?.nombre}"? Esta acción no se puede deshacer.`;
  }

  onDelete(doc: Documento) {
    this.docAEliminar = doc;
  }

  confirmarEliminar() {
    if (!this.docAEliminar) return;
    this.http.delete(`${environment.apiUrl}/documento/${this.docAEliminar.id}`)
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

  onGuardarAlta(formData: any) {
    if (!formData.archivo) {
      toast.error('Seleccioná un archivo');
      return;
    }

    const tipoDocumentoId = this.tipoIdMap[formData.tipo] ?? this.tipoIdMap['OTRO'];

    const fd = new FormData();
    fd.append('archivo',          formData.archivo);
    fd.append('expediente',       String(this.expedienteId));
    fd.append('tipo_documento',   String(tipoDocumentoId));
    fd.append('usuario_creacion', '1');
    if (formData.descripcion)    fd.append('descripcion',    formData.descripcion);
    if (formData.fechaDocumento) fd.append('fecha_documento', formData.fechaDocumento);
    if (formData.relacionadoId)  fd.append('novedad',         formData.relacionadoId);

    this.http.post<any>(`${environment.apiUrl}/subirDocumento`, fd)
      .subscribe({
        next: () => {
          this.cargarDocumentos();
          toast.success('Documento subido correctamente');
        },
        error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al subir el documento'),
      });
  }

  onGuardarEdit(changes: Partial<Documento>) {
    if (!this.selectedDoc) return;

    const fd = new FormData();
    fd.append('idexpediente', String(this.expedienteId));
    if (changes.descripcion)    fd.append('descripcion',     changes.descripcion);
    if (changes.fechaDocumento) fd.append('fecha_documento',  changes.fechaDocumento);
    if (changes.relacionadoId)  fd.append('novedad',          changes.relacionadoId);

    this.http.put<any>(`${environment.apiUrl}/documento/${this.selectedDoc.id}`, fd)
      .subscribe({
        next: () => {
          this.cargarDocumentos();
          this.selectedDoc = null;
          toast.success('Documento actualizado correctamente');
        },
        error: () => toast.error('Error al actualizar el documento'),
      });
  }

  onDownload(doc: Documento) {
    if (doc.url && doc.url !== '#') {
      window.open(doc.url, '_blank');
    } else {
      toast.error('URL de descarga no disponible');
    }
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

}