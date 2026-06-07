import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpedienteHeader } from '../../components/expediente-header/expediente-header';
import { ExpedienteFilters, ExpedienteFilterState } from '../../components/expediente-filters/expediente-filters';
import { ExpedienteTable, Expediente } from '../../components/expediente-table/expediente-table';
import { ExpedientesService } from '../../services/expedientes.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-expediente-list',
  standalone: true,
  imports: [CommonModule, ExpedienteHeader, ExpedienteFilters, ExpedienteTable],
  templateUrl: './expediente-list.html',
})
export class ExpedienteList implements OnInit {
  private expedientesService = inject(ExpedientesService);
  private cdr = inject(ChangeDetectorRef);

  expedientesFiltrados: Expediente[] = [];
  expedientesPagina: Expediente[] = [];

  currentPage = 1;
  readonly pageSize = PAGE_SIZE;

  totalRegistros = 0;

  get total(): number { return this.totalRegistros; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  ngOnInit(): void {
      this.cargarExpedientes();
  }

  onExpedienteCreado(_data: any): void {
    this.cargarExpedientes();
  }

  onEliminar(expediente: Expediente): void {
    this.expedientesService.eliminar(Number(expediente.id)).subscribe({
        next: () => this.cargarExpedientes(),
    });
  }

  cargando = false;

  private filtrosActivos: ExpedienteFilterState = {
      numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '',
  };

  private cargarExpedientes(): void {
      this.cargando = true;
      this.expedientesService.listar({
          ...this.filtrosActivos,
          pagina: this.currentPage,
          pageSize: this.pageSize,
      }).subscribe({
          next: (res) => {
              this.totalRegistros = res.total;
              this.expedientesFiltrados = [...res.data];
              this.expedientesPagina = [...res.data];
              this.cargando = false;
              this.cdr.detectChanges();
          },
          error: (err) => {
              this.cargando = false;
              this.cdr.detectChanges();
          }
      });
  }

  onFiltersChange(filtros: ExpedienteFilterState): void {
    this.filtrosActivos = filtros;
    this.currentPage = 1;
    this.cargarExpedientes();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cargarExpedientes();
  }
}