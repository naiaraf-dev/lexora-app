import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogStats, LogEntry, LogFiltros } from '../../models/log.model';

import { TableColumn, UiTable } from '../../../../shared/components/ui-table/ui-table';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { Log } from '../../services/log';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { UiStatCard } from '../../../../shared/components/ui-stats-card/ui-stats-card';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import * as XLSXStyle from 'xlsx-js-style';

@Component({
  selector: 'app-log-view',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTable, UiSelect, UiInput, UiPagination, UiStatCard, UiModal, PrimaryBtn],
  templateUrl: './log-view.html',
})
export class LogView implements OnInit {
  // Estado
  stats         = signal<LogStats>({ totalEventos: 0, exitosos: 0, errores: 0, usuariosActivos: 0 });
  logs          = signal<LogEntry[]>([]);
  totalLogs     = signal(0);
  paginaActual  = signal(1);
  porPagina     = 5;
  totalPaginas  = computed(() => Math.max(1, Math.ceil(this.totalLogs() / this.porPagina)));
  filtrosAbiertos = signal(true);

  filtros: LogFiltros = {};

  // Modal detalle
  modalAbierto   = signal(false);
  logSeleccionado = signal<LogEntry | null>(null);

  // Opciones selects
  usuarioOpts   = signal<{ label: string; value: string }[]>([]);
  moduloOpts    = [
    { label: 'Expedientes', value: 'Expedientes' },
    { label: 'Clientes',    value: 'Clientes'    },
    { label: 'Documentos',  value: 'Documentos'  },
    { label: 'Agenda',      value: 'Agenda'      },
    { label: 'Reportes',    value: 'Reportes'    },
    { label: 'Sistema',     value: 'Sistema'     },
  ];
  accionOpts    = [
    { label: 'Alta',        value: 'Alta'        },
    { label: 'Edición',     value: 'Edición'     },
    { label: 'Eliminación', value: 'Eliminación' },
    { label: 'Descarga',    value: 'Descarga'    },
    { label: 'Login',       value: 'Login'       },
    { label: 'Logout',      value: 'Logout'      },
  ];
  resultadoOpts = [
    { label: 'OK',    value: 'OK'    },
    { label: 'Error', value: 'Error' },
  ];

  // Columnas tabla
  columns: TableColumn[] = [
    { key: 'fechaHora',   label: 'Fecha y Hora', type: 'date'   },
    { key: 'usuario',     label: 'Usuario',      type: 'text'   },
    {
      key: 'accion', label: 'Acción', type: 'badge',
      badgeConfig: {
        'Alta':        { label: 'Alta',        classes: 'bg-success/10 text-success',  dot: 'bg-success'  },
        'Edición':     { label: 'Edición',     classes: 'bg-primary/10 text-primary',  dot: 'bg-primary'  },
        'Eliminación': { label: 'Eliminación', classes: 'bg-danger/10 text-danger',    dot: 'bg-danger'   },
        'Descarga':    { label: 'Descarga',    classes: 'bg-warning/10 text-warning',  dot: 'bg-warning'  },
        'Login':       { label: 'Login',       classes: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
        'Logout':      { label: 'Logout',      classes: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
      },
    },
    {
      key: 'modulo', label: 'Módulo', type: 'badge',
      badgeConfig: {
        'Expedientes': { label: 'Expedientes', classes: 'bg-primary/10 text-primary',   dot: 'bg-primary'   },
        'Clientes':    { label: 'Clientes',    classes: 'bg-pink-100 text-pink-500',     dot: 'bg-pink-400'  },
        'Documentos':  { label: 'Documentos',  classes: 'bg-warning/10 text-warning',   dot: 'bg-warning'   },
        'Agenda':      { label: 'Agenda',      classes: 'bg-purple-100 text-purple-500', dot: 'bg-purple-400'},
        'Reportes':    { label: 'Reportes',    classes: 'bg-teal-100 text-teal-600',     dot: 'bg-teal-500'  },
        'Sistema':     { label: 'Sistema',     classes: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400'  },
      },
    },
    { key: 'descripcion', label: 'Descripción', type: 'text' },
    {
      key: 'resultado', label: 'Resultado', type: 'badge',
      badgeConfig: {
        'OK':    { label: 'OK',    classes: 'bg-success/10 text-success', dot: 'bg-success' },
        'Error': { label: 'Error', classes: 'bg-danger/10 text-danger',   dot: 'bg-danger'  },
      },
    },
    { key: 'acciones', label: 'Acciones', type: 'actions', actions: ['view'] },
  ];

  constructor(private logService: Log) {}

  ngOnInit() {
    this.stats.set(this.logService.getStats());
    this.usuarioOpts.set(this.logService.getUsuarios().map(u => ({ label: u, value: u })));
    this.cargarLogs();
  }

  cargarLogs() {
    const { data, total } = this.logService.getLogs(this.filtros, this.paginaActual(), this.porPagina);
    this.logs.set(data);
    this.totalLogs.set(total);
  }

  buscar() {
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  limpiar() {
    this.filtros = {};
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  irPagina(p: number | '...') {
    if (typeof p !== 'number') return;
    this.paginaActual.set(p);
    this.cargarLogs();
  }

  exportar(): void {
    const logs = this.logService.getAllLogs(this.filtros);

    const headers = ['ID', 'Fecha y Hora', 'Usuario', 'Acción', 'Módulo', 'Descripción', 'Resultado'];

    const filaHeaders = headers.map(h => ({
      v: h,
      t: 's',
      s: {
        fill: { fgColor: { rgb: '6366F1' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
          bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
          left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
          right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
        }
      }
    }));

    const filasDatos = logs.map(l => [
      l.id,
      new Date(l.fechaHora).toLocaleString('es-AR'),
      l.usuario,
      l.accion,
      l.modulo,
      l.descripcion,
      l.resultado,
    ].map(v => ({
      v: v ?? '',
      t: 's',
      s: {
        alignment: { vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        }
      }
    })));

    const ws = XLSXStyle.utils.aoa_to_sheet([filaHeaders, ...filasDatos]);

    ws['!cols'] = [
      { wch: 6  }, // ID
      { wch: 18 }, // Fecha y Hora
      { wch: 20 }, // Usuario
      { wch: 13 }, // Acción
      { wch: 14 }, // Módulo
      { wch: 50 }, // Descripción
      { wch: 10 }, // Resultado
    ];

    ws['!rows'] = [{ hpt: 22 }];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Log de Seguridad');
    XLSXStyle.writeFile(wb, `log-seguridad-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  onTableAction(event: any) {
    if (event.type === 'view') {
      this.logSeleccionado.set(event.row);
      this.modalAbierto.set(true);
    }
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.logSeleccionado.set(null);
  }
}