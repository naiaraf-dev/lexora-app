import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpedienteHeader } from '../../components/expediente-header/expediente-header';
import { ExpedienteFilters, ExpedienteFilterState } from '../../components/expediente-filters/expediente-filters';
import { ExpedienteTable, Expediente } from '../../components/expediente-table/expediente-table';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-expediente-list',
  standalone: true,
  imports: [CommonModule, ExpedienteHeader, ExpedienteFilters, ExpedienteTable],
  templateUrl: './expediente-list.html',
})
export class ExpedienteList {

  // 🔴 MOCK — reemplazar por ExpedientesService.getAll() en ngOnInit
  private todosLosExpedientes: Expediente[] = [
    {
      id: 'EXP-2025-1001',
      numero: 'EXP-2025-1001',
      causa: '45678/2025',
      caratula: 'García c/ López s/ Daños y perjuicios',
      clienteIds: ['2'],
      clienteNombre: 'García, Juan Carlos',
      area: 'CIVIL',
      tipo: 'DEMANDA_CIVIL',
      tipoLabel: 'Demanda Civil',
      estado: 'EN_TRAMITE',
      fechaInicio: '2025-03-01T10:00:00.000Z',
      ultimaActualizacion: '2025-04-15T14:30:00.000Z',
    },
    {
      id: 'EXP-2025-1002',
      numero: 'EXP-2025-1002',
      causa: '12345/2025',
      caratula: 'Acme S.A. c/ Constructora del Sur s/ Cobro de pesos',
      clienteIds: ['1', '5'],
      clienteNombre: 'Acme S.A.',
      area: 'COMERCIAL',
      tipo: 'RECUPERO',
      tipoLabel: 'Recuperos',
      estado: 'EN_TRAMITE',
      fechaInicio: '2025-01-10T09:00:00.000Z',
      ultimaActualizacion: '2025-05-01T11:00:00.000Z',
    },
    {
      id: 'EXP-2024-0542',
      numero: 'EXP-2024-0542',
      causa: '98765/2024',
      caratula: 'Rodríguez c/ López Hnos. s/ Despido',
      clienteIds: ['4'],
      clienteNombre: 'Rodríguez, María Elena',
      area: 'LABORAL',
      tipo: 'DEMANDA_LABORAL',
      tipoLabel: 'Demanda Laboral',
      estado: 'FINALIZADO',
      fechaInicio: '2024-06-20T08:00:00.000Z',
      ultimaActualizacion: '2025-02-28T16:00:00.000Z',
    },
    {
      id: 'EXP-2024-0310',
      numero: 'EXP-2024-0310',
      causa: '—',
      caratula: 'López Hnos. s/ Querella por estafa',
      clienteIds: ['3'],
      clienteNombre: 'López Hnos. S.R.L.',
      area: 'PENAL',
      tipo: 'QUERELLA',
      tipoLabel: 'Querellas',
      estado: 'ARCHIVADO',
      fechaInicio: '2024-02-05T10:00:00.000Z',
      ultimaActualizacion: '2024-11-30T09:00:00.000Z',
    },
  ];

  expedientesFiltrados: Expediente[] = [];
  expedientesPagina: Expediente[] = [];

  currentPage = 1;
  readonly pageSize = PAGE_SIZE;

  get total(): number { return this.expedientesFiltrados.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  // 🔴 MOCK — reemplazar por ExpedientesService
  private clientes: { id: string; nombre: string }[] = [
    { id: '1', nombre: 'Acme S.A.' },
    { id: '2', nombre: 'García, Juan Carlos' },
    { id: '3', nombre: 'López Hnos. S.R.L.' },
    { id: '4', nombre: 'Rodríguez, María Elena' },
    { id: '5', nombre: 'Constructora del Sur S.A.' },
  ];

  constructor() {
    this.aplicarFiltros(this.filtrosActivos);
  }

  onExpedienteCreado(data: any): void {
    const nuevo: Expediente = {
      id:                  data.nroInterno,
      numero:              data.nroInterno,
      causa:               data.nroCausa || '—',
      caratula:            data.caratula,
      clienteIds:          data.clienteIds,
      clienteNombre:       data.clienteIds.length ? this.nombreCliente(data.clienteIds[0]) : '—',
      area:                data.area,
      tipo:                data.tipo,
      tipoLabel:           this.labelTipo(data.tipo),
      estado:              data.estado,
      fechaInicio:         new Date().toISOString(),
      ultimaActualizacion: new Date().toISOString(),
    };
    this.todosLosExpedientes = [nuevo, ...this.todosLosExpedientes];
    this.aplicarFiltros(this.filtrosActivos);
  }

  onEliminar(expediente: Expediente): void {
    this.todosLosExpedientes = this.todosLosExpedientes.filter(e => e.id !== expediente.id);
    this.aplicarFiltros(this.filtrosActivos);
  }

  private filtrosActivos: ExpedienteFilterState = {
    numero: '', causa: '', caratula: '', area: '', tipo: '', estado: '', clienteId: '',
  };

  onFiltersChange(filtros: ExpedienteFilterState): void {
    this.filtrosActivos = filtros;
    this.currentPage = 1;
    this.aplicarFiltros(filtros);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.paginar();
  }

  private aplicarFiltros(f: ExpedienteFilterState): void {
    this.expedientesFiltrados = this.todosLosExpedientes.filter(e => {
      if (f.numero    && !e.numero.toLowerCase().includes(f.numero.toLowerCase()))       return false;
      if (f.causa     && !e.causa.toLowerCase().includes(f.causa.toLowerCase()))         return false;
      if (f.caratula  && !e.caratula.toLowerCase().includes(f.caratula.toLowerCase()))   return false;
      if (f.area      && e.area !== f.area)                                              return false;
      if (f.tipo      && e.tipo !== f.tipo)                                              return false;
      if (f.estado    && e.estado !== f.estado)                                          return false;
      if (f.clienteId && !e.clienteIds.includes(f.clienteId))                           return false;
      return true;
    });
    this.paginar();
  }

  private paginar(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.expedientesPagina = this.expedientesFiltrados.slice(start, start + this.pageSize);
  }

  private nombreCliente(id: string): string {
    return this.clientes.find(c => c.id === id)?.nombre ?? '—';
  }

  private labelTipo(code: string): string {
    const map: Record<string, string> = {
      OFICIO:            'Oficios',
      CARTA_DOC:         'Carta Documento',
      MEDIACION:         'Mediaciones',
      BENEFICIO_LITIGAR: 'Beneficios de litigar sin gastos',
      COBRO_CANON:       'Cobro de Cánones',
      RECLAMO_CONTRAT:   'Reclamo a Contratista / Proveedor',
      LANZAMIENTO:       'Lanzamientos',
      RECUPERO:          'Recuperos',
      EJECUCION_GAR:     'Ejecución de Pólizas',
      DEMANDA_CIVIL:     'Demanda Civil',
      DEMANDA_LABORAL:   'Demanda Laboral',
      DEFENSA_CIVIL:     'Defensas Civiles',
      SECLOS:            'SECLO',
      CONSIGNACION:      'Consignaciones',
      DESAFUERO:         'Desafueros',
      QUERELLA:          'Querellas',
      DEFENSA_PENAL:     'Defensas Penales',
      CARTA_SUCESO:      'Cartas Suceso',
      OTRAS:             'Otras presentaciones / gestiones',
    };
    return map[code] ?? code;
  }
}