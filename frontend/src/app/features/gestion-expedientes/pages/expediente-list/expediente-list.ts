import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpedienteHeader } from '../../components/expediente-header/expediente-header';
import { ExpedienteFilters, ExpedienteFilterState } from '../../components/expediente-filters/expediente-filters';
import { ExpedienteTable, Expediente } from '../../components/expediente-table/expediente-table';
import { ExpedientesService } from '../../services/expedientes.service';
import { Causa } from '../../components/expediente-table/expediente-table';
import { ModalAgrupar } from '../../components/modal-agrupar/modal-agrupar';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';

const PAGE_SIZE = 10;

/**
 * Página principal del módulo de gestión de expedientes.
 * Se compone del header (alta + exportar), los filtros y la tabla paginada.
 * Consume ExpedientesService para listar, filtrar y eliminar expedientes.
 */
@Component({
  selector: 'app-expediente-list',
  standalone: true,
  imports: [CommonModule, ExpedienteHeader, ExpedienteFilters, ExpedienteTable, ModalAgrupar, UiConfirmModal],
  templateUrl: './expediente-list.html',
})
export class ExpedienteList implements OnInit {
  private expedientesService = inject(ExpedientesService);
  private cdr = inject(ChangeDetectorRef);

  /** Lista completa de expedientes según filtros activos (sin paginar). */
  expedientesFiltrados: Expediente[] = [];

  /** Slice de expedientesFiltrados correspondiente a la página actual. */
  expedientesPagina: Expediente[] = [];

  currentPage = 1;
  readonly pageSize = PAGE_SIZE;

  /** Total de registros devueltos por el backend según los filtros aplicados. */
  totalRegistros = 0;

  get total(): number { return this.totalRegistros; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  ngOnInit(): void {
      this.cargarExpedientes();
  }

  /** Se dispara cuando el modal de alta emite un expediente creado. Recarga la lista. */
  onExpedienteCreado(_data: any): void {
    this.cargarExpedientes();
  }

  /** Elimina el expediente recibido (Baja lógica) y recarga la lista. */
  onEliminar(expediente: Expediente): void {
    this.expedientesService.eliminar(Number(expediente.id)).subscribe({
        next: () => this.cargarExpedientes(),
    });
  }

  cargando = false;

  /** Estado actual de los filtros aplicados. Se resetea la página al cambiar. */
  private filtrosActivos: ExpedienteFilterState = {
      numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '',
  };

  /** Llama al servicio con los filtros y paginación activos y actualiza la vista. */
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

  /** Actualiza los filtros activos, resetea a página 1 y recarga. */
  onFiltersChange(filtros: ExpedienteFilterState): void {
    this.filtrosActivos = filtros;
    this.currentPage = 1;
    this.cargarExpedientes();
  }

  /** Cambia la página activa y recarga los expedientes correspondientes. */
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cargarExpedientes();
  }

  get causas(): Causa[] {
    const agrupadas: Causa[] = [];
    const sinCausa: Causa[] = [];
    const mapa = new Map<string, Causa>();

    for (const exp of this.expedientesPagina) {
      if (!exp.numeroExpedienteJudicial) {
        sinCausa.push({
          id: exp.id,
          numeroCausa: '—',
          area: exp.area,
          expedientePrincipalId: null,
          expedientes: [exp],
        });
        continue;
      }

      const clave = exp.numeroExpedienteJudicial;

      if (!mapa.has(clave)) {
        const causa: Causa = {
          id: exp.id,
          numeroCausa: clave,
          area: exp.area,
          expedientePrincipalId: null,
          expedientes: [],
        };
        mapa.set(clave, causa);
        agrupadas.push(causa);
      }

      const causa = mapa.get(clave)!;
      causa.expedientes.push(exp);

      const esPrincipal =
        exp.tipo?.nombre === 'Demanda Civil' ||
        exp.tipo?.nombre === 'Demanda Laboral';

      if (esPrincipal || causa.expedientePrincipalId === null) {
        causa.expedientePrincipalId = exp.id;
      }
    }

    // Ordenar expedientes de cada causa: el principal primero
    for (const causa of agrupadas) {
      causa.expedientes.sort((a, b) => {
        if (a.id === causa.expedientePrincipalId) return -1;
        if (b.id === causa.expedientePrincipalId) return 1;
        return 0;
      });
    }

    return [...agrupadas, ...sinCausa];
  }

  expedienteAAgrupar: Expediente | null = null;

  onAgrupar(exp: Expediente) { this.expedienteAAgrupar = exp; }

  onAgrupado(event: { expediente: Expediente; causaId: number; numeroCausa: string }) {
    // PUT al back actualizando numero_expediente_judicial del expediente
    this.expedientesService.actualizar(Number(event.expediente.id), {
      numero_expediente_judicial: event.numeroCausa
    }).subscribe({
      next: () => {
        this.expedienteAAgrupar = null;
        this.cargarExpedientes();
      }
    });
  }

  expedienteADesagrupar: Expediente | null = null;

  onDesagrupar(exp: Expediente) { this.expedienteADesagrupar = exp; }

  confirmarDesagrupar() {
    if (!this.expedienteADesagrupar) return;
    this.expedientesService.actualizar(Number(this.expedienteADesagrupar.id), {
      numero_expediente_judicial: null
    }).subscribe({
      next: () => {
        this.expedienteADesagrupar = null;
        this.cargarExpedientes();
      }
    });
  }
}