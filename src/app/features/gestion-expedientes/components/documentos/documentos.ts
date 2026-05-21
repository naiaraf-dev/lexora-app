import { Component } from '@angular/core';
import { DocumentosFilters, DocumentoFilterState } from '../documentos-filters/documentos-filters';
import { DocumentosTable, Documento } from '../documentos-table/documentos-table';
import { ModalDocAlta } from '../modal-doc-alta/modal-doc-alta';
import { ModalDocView } from '../modal-doc-view/modal-doc-view';
import { ModalDocEdit } from '../modal-doc-edit/modal-doc-edit';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [DocumentosFilters, DocumentosTable, ModalDocAlta, ModalDocView, ModalDocEdit, PrimaryBtn],
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

  onView(doc: Documento)   { this.selectedDoc = doc; this.modalViewOpen = true; }
  onEdit(doc: Documento)   { this.selectedDoc = doc; this.modalEditOpen = true; }
  onDelete(doc: Documento) {
    this.allDocumentos = this.allDocumentos.filter(d => d.id !== doc.id);
    this.filteredDocumentos = this.filteredDocumentos.filter(d => d.id !== doc.id);
    toast.success('Documento eliminado');
  }

  onGuardarAlta(doc: any) {
    toast.success('Documento subido correctamente');
    // 🔴 MOCK — agregar a la lista local o refrescar desde servicio
  }

  onGuardarEdit(changes: Partial<Documento>) {
    toast.success('Documento actualizado correctamente');
    // 🔴 MOCK — actualizar en lista local o refrescar
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}