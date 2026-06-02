import { Component, computed, inject } from '@angular/core';
import { DocumentosFilters, DocumentoFilterState } from '../documentos-filters/documentos-filters';
import { DocumentosTable, Documento } from '../documentos-table/documentos-table';
import { ModalDocAlta } from '../modal-doc-alta/modal-doc-alta';
import { ModalDocEdit } from '../modal-doc-edit/modal-doc-edit';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ExpedienteStore } from '../../services/expediente-store';
import { toast } from 'ngx-sonner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DocumentosFilters, DocumentosTable, ModalDocAlta, ModalDocEdit, PrimaryBtn],
  templateUrl: './documentos.html',
})
export class Documentos {
  private store = inject(ExpedienteStore);
  private router = inject(Router);

  // Filtros activos
  activeFilters: DocumentoFilterState = { nombre: '', tipo: '' };

  // Lista filtrada (derivada del store)
  get allDocumentos(): Documento[] { return this.store.documentos(); }

  get filteredDocumentos(): Documento[] {
    const f = this.activeFilters;
    return this.allDocumentos.filter(d =>
      (!f.nombre || d.nombre.toLowerCase().includes(f.nombre.toLowerCase())) &&
      (!f.tipo   || d.tipo === f.tipo)
    );
  }

  // Paginación
  pageSize = 10;
  currentPage = 1;
  get totalPages() { return Math.max(1, Math.ceil(this.filteredDocumentos.length / this.pageSize)); }
  get pagedDocumentos() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  // Opciones novedades para el select "Relacionado con"
  get novedadOpciones() { return this.store.novedadesComoOpciones(); }

  // Modales
  modalAltaRef: any;
  modalEditOpen = false;
  selectedDoc: Documento | null = null;

  onFiltersChange(f: DocumentoFilterState) {
    this.activeFilters = f;
    this.currentPage = 1;
  }

  onEdit(doc: Documento)   { this.selectedDoc = doc; this.modalEditOpen = true; }

  onDelete(doc: Documento) {
    this.store.eliminarDocumento(doc.id);
    toast.success('Documento eliminado');
  }

  onGuardarAlta(formData: any) {
    const relacionadoNovedad = this.store.novedades().find(n => n.id === formData.relacionadoId);
    const nuevo: Documento = {
      id:             crypto.randomUUID(),
      nombre:         formData.archivo?.name ?? 'Sin nombre',
      tipo:           formData.tipo || 'OTRO',
      tipoLabel:      this.tipoLabel(formData.tipo),
      relacionadoCon: relacionadoNovedad ? `Novedad: ${relacionadoNovedad.titulo}` : '',
      relacionadoId:  formData.relacionadoId ?? '',
      fechaCarga:     new Date().toISOString(),
      tamanio:        formData.archivo ? this.formatSize(formData.archivo.size) : '—',
      descripcion:    formData.descripcion ?? '',
      fechaDocumento: formData.fechaDocumento ?? '',
      url:            '#', // 🔴 MOCK — reemplazar por URL real del storage
    };
    this.store.agregarDocumento(nuevo);
    toast.success('Documento subido correctamente');
  }

  onGuardarEdit(changes: Partial<Documento>) {
    if (!this.selectedDoc) return;
    const relacionadoNovedad = changes.relacionadoId
      ? this.store.novedades().find(n => n.id === changes.relacionadoId)
      : null;
    const update: Partial<Documento> = {
      ...changes,
      tipoLabel:      changes.tipo ? this.tipoLabel(changes.tipo) : this.selectedDoc.tipoLabel,
      relacionadoCon: relacionadoNovedad
        ? `Novedad: ${relacionadoNovedad.titulo}`
        : (changes.relacionadoId === '' ? '' : this.selectedDoc.relacionadoCon),
    };
    this.store.actualizarDocumento(this.selectedDoc.id, update);
    this.selectedDoc = null;
    toast.success('Documento actualizado correctamente');
  }

  private tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      ESCRITO: 'Escrito', CONTRATO: 'Contrato', OFICIO: 'Oficio',
      PERICIAL: 'Pericial', SENTENCIA: 'Sentencia', OTRO: 'Otro',
    };
    return map[tipo] ?? tipo;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  onDownload(doc: Documento) {
    // 🔴 MOCK — url: '#' no descarga nada
    // Cuando el back esté listo, doc.url va a ser una URL real (a definir)
    // y esto va a funcionar solo
    window.open(doc.url, '_blank');
  }
}