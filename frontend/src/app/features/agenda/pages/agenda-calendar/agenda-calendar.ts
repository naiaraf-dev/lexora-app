import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaService, TareaAgenda } from '../../services/agenda';
import { TareaItem } from '../../components/tarea-item/tarea-item';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';

interface DiaCalendario {
  numero: number;
  fecha: string;
  tareas: TareaAgenda[];
}

@Component({
  selector: 'app-agenda-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TareaItem, UiSelect, UiModal, UiTable, UiPagination],
  templateUrl: './agenda-calendar.html',
})
export class AgendaCalendar implements OnInit {
  tareas: TareaAgenda[] = [];
  tareasFiltradas: TareaAgenda[] = [];

  vista: 'calendario' | 'lista' = 'calendario';

  mesActual = 1;
  anioActual = 2026;

  filtroPrioridad = '';
  filtroExpediente = '';
  filtroCliente = '';

  mostrarPendientes = true;
  mostrarVencidas = true;
  mostrarCumplidas = true;

  diasSemana = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  diasCalendario: DiaCalendario[] = [];

  tareaSeleccionada: TareaAgenda | null = null;

  // TODO: reemplazar por AgendaService.getPrioridades() cuando esté el backend
  prioridadOptions = [
    { value: 'Baja', label: 'Baja' },
    { value: 'Media', label: 'Media' },
    { value: 'Alta', label: 'Alta' },
    { value: 'Crítica', label: 'Crítica' },
  ];

  // TODO: reemplazar por ExpedientesService.getAll() cuando esté el backend
  get expedienteOptions() {
    return this.obtenerExpedientes().map(e => ({ value: e, label: e }));
  }

  limpiarFiltros(): void {
    this.filtroPrioridad = '';
    this.filtroExpediente = '';
    this.filtroCliente = '';
    this.mostrarPendientes = true;
    this.mostrarVencidas = true;
    this.mostrarCumplidas = true;
    this.aplicarFiltros();
  }

  // TODO: reemplazar por ClientesService.getAll() cuando esté el backend
  get clienteOptions() {
    return this.obtenerClientes().map(c => ({ value: c, label: c }));
  }

  // Paginación lista
  paginaActual = 1;
  porPagina = 10;

  get tareasListaPaginadas(): TareaAgenda[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.tareasFiltradas.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.tareasFiltradas.length / this.porPagina));
  }

  onPageChange(p: number) {
    this.paginaActual = p;
  }

  onTablaAccion(event: { type: string; row: TareaAgenda }) {
    if (event.type === 'view') this.abrirDetalle(event.row);
    if (event.type === 'complete') this.marcarCumplida(event.row);
  }

  columnaslista: TableColumn[] = [
    { key: 'fecha',       label: 'Fecha',      type: 'date'   },
    { key: 'hora',        label: 'Hora',       type: 'text'   },
    { key: 'titulo',      label: 'Tarea',      type: 'text'   },
    { key: 'expediente',  label: 'Expediente', type: 'text'   },
    { key: 'cliente',     label: 'Cliente',    type: 'text'   },
    {
      key: 'prioridad', label: 'Prioridad', type: 'badge',
      badgeConfig: {
        'Baja':    { label: 'Baja',    classes: 'bg-success/10 text-success',  dot: 'bg-success'  },
        'Media':   { label: 'Media',   classes: 'bg-warning/10 text-warning',  dot: 'bg-warning'  },
        'Alta':    { label: 'Alta',    classes: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
        'Crítica': { label: 'Crítica', classes: 'bg-danger/10 text-danger',    dot: 'bg-danger'   },
      }
    },
    {
      key: 'estado', label: 'Estado', type: 'badge',
      badgeConfig: {
        'Pendiente': { label: 'Pendiente', classes: 'bg-warning/10 text-warning',  dot: 'bg-warning'  },
        'En curso':  { label: 'En curso',  classes: 'bg-info/10 text-info',        dot: 'bg-info'     },
        'Vencida':   { label: 'Vencida',   classes: 'bg-danger/10 text-danger',    dot: 'bg-danger'   },
        'Cumplida':  { label: 'Cumplida',  classes: 'bg-success/10 text-success',  dot: 'bg-success'  },
      }
    },
    {
      key: 'acciones', label: 'Acciones', type: 'actions',
      getActions: (row: TareaAgenda) => row.estado !== 'Cumplida' ? ['view', 'complete'] : ['view']
    },
  ];

  constructor(private agendaService: AgendaService) {}

  ngOnInit(): void {
    this.agendaService.tareas$.subscribe((tareas) => {
      this.tareas = tareas;
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    this.tareasFiltradas = this.tareas.filter((tarea) => {
      const coincidePrioridad =
        !this.filtroPrioridad || tarea.prioridad === this.filtroPrioridad;

      const coincideExpediente =
        !this.filtroExpediente || tarea.expediente === this.filtroExpediente;

      const coincideCliente =
        !this.filtroCliente || tarea.cliente === this.filtroCliente;

      const coincideEstado =
        (this.mostrarPendientes && (tarea.estado === 'Pendiente' || tarea.estado === 'En curso')) ||
        (this.mostrarVencidas && tarea.estado === 'Vencida') ||
        (this.mostrarCumplidas && tarea.estado === 'Cumplida');

      return coincidePrioridad && coincideExpediente && coincideCliente && coincideEstado;
    });

    this.generarCalendario();
  }

  generarCalendario(): void {
    const cantidadDias = new Date(this.anioActual, this.mesActual + 1, 0).getDate();

    this.diasCalendario = Array.from({ length: cantidadDias }, (_, index) => {
      const dia = index + 1;
      const fecha = this.formatearFecha(this.anioActual, this.mesActual + 1, dia);

      return {
        numero: dia,
        fecha,
        tareas: this.tareasFiltradas.filter((tarea) => tarea.fecha === fecha),
      };
    });
  }

  cambiarMes(direccion: number): void {
    this.mesActual += direccion;

    if (this.mesActual < 0) {
      this.mesActual = 11;
      this.anioActual--;
    }

    if (this.mesActual > 11) {
      this.mesActual = 0;
      this.anioActual++;
    }

    this.aplicarFiltros();
  }

  formatearFecha(anio: number, mes: number, dia: number): string {
    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');

    return `${anio}-${mm}-${dd}`;
  }

  obtenerNombreMes(): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return `${meses[this.mesActual]} ${this.anioActual}`;
  }

  abrirDetalle(tarea: TareaAgenda): void {
    this.tareaSeleccionada = tarea;
  }

  cerrarDetalle(): void {
    this.tareaSeleccionada = null;
  }

  marcarCumplida(tarea: TareaAgenda): void {
    this.agendaService.marcarCumplida(tarea.id);
    this.cerrarDetalle();
  }

  obtenerPendientes(): number {
    return this.tareas.filter((t) => t.estado === 'Pendiente' || t.estado === 'En curso').length;
  }

  obtenerVencidas(): number {
    return this.tareas.filter((t) => t.estado === 'Vencida').length;
  }

  obtenerBadgePrioridad(prioridad: string): string {
    if (prioridad === 'Crítica') return 'bg-red-100 text-red-600';
    if (prioridad === 'Alta') return 'bg-orange-100 text-orange-600';
    if (prioridad === 'Media') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-600';
  }

  obtenerBadgeEstado(estado: string): string {
    if (estado === 'Vencida') return 'bg-red-100 text-red-600';
    if (estado === 'Cumplida') return 'bg-green-100 text-green-600';
    if (estado === 'En curso') return 'bg-blue-100 text-blue-600';
    return 'bg-orange-100 text-orange-600';
  }

  obtenerFechaArgentina(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  obtenerExpedientes(): string[] {
    return [...new Set(this.tareas.map((t) => t.expediente))];
  }

  obtenerClientes(): string[] {
    return [...new Set(this.tareas.map((t) => t.cliente))];
  }
}