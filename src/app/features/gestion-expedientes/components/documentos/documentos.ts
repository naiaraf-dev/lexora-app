import { Component } from '@angular/core';
import { DocumentosFilters, DocumentoFilterState } from '../documentos-filters/documentos-filters';
import { DocumentosTable, Documento } from '../documentos-table/documentos-table';
import { ModalDocAlta } from '../modal-doc-alta/modal-doc-alta';
import { ModalDocEdit } from '../modal-doc-edit/modal-doc-edit';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DocumentosFilters, DocumentosTable, ModalDocAlta, ModalDocEdit, PrimaryBtn],
  templateUrl: './documentos.html',
})
export class Documentos {
  constructor(
    private router: Router,
  ) {}

  // 🔴 MOCK
  allDocumentos: Documento[] = [
    { id: '1', nombre: 'Demanda inicial.pdf',    tipo: 'ESCRITO',  tipoLabel: 'Escrito',  relacionadoCon: 'Novedad: Presentación de prueba', fechaCarga: '2025-06-15T00:00:00', tamanio: '3.4 MB',  descripcion: '', fechaDocumento: '2025-06-01' },
    { id: '2', nombre: 'Contrato_locacion.pdf',  tipo: 'CONTRATO', tipoLabel: 'Contrato', relacionadoCon: '',                                  fechaCarga: '2026-01-06T00:00:00', tamanio: '156 KB', descripcion: '', fechaDocumento: '2026-01-05' },
    { id: '3', nombre: 'Demanda inicial.pdf',    tipo: 'OFICIO',   tipoLabel: 'Oficio',   relacionadoCon: 'Novedad: Oficio recibido',           fechaCarga: '2025-12-23T00:00:00', tamanio: '245 KB', descripcion: '', fechaDocumento: '2025-12-20' },
  ];

  filteredDocumentos: Documento[] = [...this.allDocumentos];

  // Paginación
  pageSize = 25;
  currentPage = 1;
  get totalPages() { return Math.max(1, Math.ceil(this.filteredDocumentos.length / this.pageSize)); }
  get pagedDocumentos() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocumentos.slice(start, start + this.pageSize);
  }

  // Modales
  modalAltaRef: any;
  modalViewOpen = false;
  modalEditOpen = false;
  selectedDoc: Documento | null = null;

  onFiltersChange(f: DocumentoFilterState) {
    this.filteredDocumentos = this.allDocumentos.filter(d =>
      (!f.nombre || d.nombre.toLowerCase().includes(f.nombre.toLowerCase())) &&
      (!f.tipo   || d.tipo === f.tipo)
    );
    this.currentPage = 1;
  }

  onEdit(doc: Documento)   { this.selectedDoc = doc; this.modalEditOpen = true; }
  onDelete(doc: Documento) {
    this.allDocumentos = this.allDocumentos.filter(d => d.id !== doc.id);
    this.filteredDocumentos = this.filteredDocumentos.filter(d => d.id !== doc.id);
    toast.success('Documento eliminado');
  }

  onGuardarAlta(doc: any) {
    const nuevo: Documento = {
      id:             Date.now().toString(),
      nombre:         doc.archivo?.name ?? 'Sin nombre',
      tipo:           doc.tipo,
      tipoLabel:      this.tipoOptions[doc.tipo] ?? doc.tipo,
      relacionadoCon: doc.relacionadoCon,
      fechaCarga:     new Date().toISOString(),
      tamanio:        doc.archivo ? this.formatSize(doc.archivo.size) : '—',
      descripcion:    doc.descripcion,
      fechaDocumento: doc.fechaDocumento,
    };
    this.allDocumentos = [nuevo, ...this.allDocumentos];
    this.filteredDocumentos = [nuevo, ...this.filteredDocumentos];
    toast.success('Documento subido correctamente');
  }

  private tipoOptions: Record<string, string> = {
    ESCRITO:   'Escrito',
    CONTRATO:  'Contrato',
    OFICIO:    'Oficio',
    PERICIAL:  'Pericial',
    SENTENCIA: 'Sentencia',
    OTRO:      'Otro',
  };

  private formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onGuardarEdit(changes: Partial<Documento>) {
    if (!this.selectedDoc) return;

    const tipoLabel = changes.tipo ? (this.tipoOptions[changes.tipo] ?? changes.tipo) : this.selectedDoc.tipoLabel;

    const actualizado: Documento = {
      ...this.selectedDoc,
      ...changes,
      tipoLabel,
    };

    this.allDocumentos = this.allDocumentos.map(d =>
      d.id === this.selectedDoc!.id ? actualizado : d
    );
    this.filteredDocumentos = this.filteredDocumentos.map(d =>
      d.id === this.selectedDoc!.id ? actualizado : d
    );

    this.selectedDoc = null;
    toast.success('Documento actualizado correctamente');
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}