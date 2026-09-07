import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { UiBadge } from '../../../../shared/components/ui-badge/ui-badge';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ModalPrevisionAltaGlobal } from '../../components/modal-prevision-alta/modal-prevision-alta';

// 🔴 MOCK — 8 escenarios según documento funcional
const MOCK_PREVISIONES = [
  // 1. Expediente con previsión activa y liquidación aprobada → Listo para impulsar
  {
    id: 1,
    expediente: 'EXP-2026-00123',
    cliente: 'Empresa Constructora S.A.',
    concepto: 'Capital',
    modo: 'Activo',
    fechaResolucion: '10/06/2026',
    montoBase: '$5.000.000',
    montoPrevisto: '$7.350.000',
    ultimaLiquidacion: '16/08/2026',
    estado: 'Listo para impulsar',
  },
  // 2. Expediente con liquidación no firme → Con previsión pero bloqueado
  {
    id: 2,
    expediente: 'EXP-2026-00087',
    cliente: 'García, Juan Carlos',
    concepto: 'Honorarios',
    modo: 'Activo',
    fechaResolucion: '22/03/2026',
    montoBase: '$1.200.000',
    montoPrevisto: '$1.480.000',
    ultimaLiquidacion: '01/07/2026',
    estado: 'Con previsión',
  },
  // 3. Expediente con pago parcial → Impulsado con saldo pendiente
  {
    id: 3,
    expediente: 'EXP-2025-00412',
    cliente: 'López Hnos. S.R.L.',
    concepto: 'Costas',
    modo: 'Activo',
    fechaResolucion: '05/11/2025',
    montoBase: '$3.800.000',
    montoPrevisto: '$4.650.000',
    ultimaLiquidacion: '10/08/2026',
    estado: 'Impulsado',
  },
  // 4. Expediente pagado y acreditado → Acreditado
  {
    id: 4,
    expediente: 'EXP-2025-00198',
    cliente: 'Rodríguez, María Elena',
    concepto: 'Capital',
    modo: 'Activo',
    fechaResolucion: '18/06/2025',
    montoBase: '$890.000',
    montoPrevisto: '$1.050.000',
    ultimaLiquidacion: '30/06/2026',
    estado: 'Acreditado',
  },
  // 5. Expediente en seguimiento porque paga un tercero → En seguimiento
  {
    id: 5,
    expediente: 'EXP-2025-00731',
    cliente: 'Martínez, Roberto',
    concepto: 'Capital',
    modo: 'Seguimiento',
    fechaResolucion: '14/04/2025',
    montoBase: '$2.100.000',
    montoPrevisto: '$2.580.000',
    ultimaLiquidacion: '15/07/2026',
    estado: 'En seguimiento',
  },
  // 6. Expediente con honorarios y factura pendiente → Con previsión bloqueado
  {
    id: 6,
    expediente: 'EXP-2026-00341',
    cliente: 'Fernández & Asociados S.A.',
    concepto: 'Honorarios',
    modo: 'Activo',
    fechaResolucion: '28/05/2026',
    montoBase: '$780.000',
    montoPrevisto: '$920.000',
    ultimaLiquidacion: '20/08/2026',
    estado: 'Con previsión',
  },
  // 7. Expediente con prorrateo art. 730 → Listo para impulsar con prorrateo
  {
    id: 7,
    expediente: 'EXP-2024-00892',
    cliente: 'Construcciones Del Valle S.R.L.',
    concepto: 'Capital',
    modo: 'Activo',
    fechaResolucion: '03/09/2024',
    montoBase: '$4.200.000',
    montoPrevisto: '$5.100.000',
    ultimaLiquidacion: '05/08/2026',
    estado: 'Listo para impulsar',
  },
  // 8. Expediente con varios ítems → Con previsión múltiple
  {
    id: 8,
    expediente: 'EXP-2024-00531',
    cliente: 'Acme S.A.',
    concepto: 'Capital',
    modo: 'Activo',
    fechaResolucion: '12/09/2024',
    montoBase: '$6.400.000',
    montoPrevisto: '$8.100.000',
    ultimaLiquidacion: '15/08/2026',
    estado: 'Cerrado',
  },
];

// 🔴 MOCK
const MOCK_TODAS_LIQUIDACIONES = [
  { expediente: 'EXP-2026-00123', cliente: 'Empresa Constructora S.A.',      fecha: '16/08/2026', fechaDesde: '10/06/2026', fechaHasta: '16/08/2026', capital: '$5.000.000', intereses: '$1.200.000', otros: '$150.000', total: '$7.350.000', estado: 'Aprobada / firme' },
  { expediente: 'EXP-2026-00123', cliente: 'Empresa Constructora S.A.',      fecha: '01/06/2026', fechaDesde: '10/06/2026', fechaHasta: '01/06/2026', capital: '$5.000.000', intereses: '$800.000',   otros: '$0',       total: '$5.800.000', estado: 'Practicada'       },
  { expediente: 'EXP-2026-00087', cliente: 'García, Juan Carlos',             fecha: '01/07/2026', fechaDesde: '22/03/2026', fechaHasta: '01/07/2026', capital: '$1.200.000', intereses: '$180.000',   otros: '$100.000', total: '$1.480.000', estado: 'Con traslado'     },
  { expediente: 'EXP-2025-00412', cliente: 'López Hnos. S.R.L.',              fecha: '10/08/2026', fechaDesde: '05/11/2025', fechaHasta: '10/08/2026', capital: '$3.800.000', intereses: '$650.000',   otros: '$200.000', total: '$4.650.000', estado: 'Impugnada'        },
  { expediente: 'EXP-2025-00198', cliente: 'Rodríguez, María Elena',          fecha: '30/06/2026', fechaDesde: '18/06/2025', fechaHasta: '30/06/2026', capital: '$890.000',   intereses: '$110.000',   otros: '$50.000',  total: '$1.050.000', estado: 'Aprobada / firme' },
  { expediente: 'EXP-2025-00731', cliente: 'Martínez, Roberto',               fecha: '15/07/2026', fechaDesde: '14/04/2025', fechaHasta: '15/07/2026', capital: '$2.100.000', intereses: '$380.000',   otros: '$100.000', total: '$2.580.000', estado: 'Aprobada / firme' },
  { expediente: 'EXP-2026-00341', cliente: 'Fernández & Asociados S.A.',      fecha: '20/08/2026', fechaDesde: '28/05/2026', fechaHasta: '20/08/2026', capital: '$780.000',   intereses: '$90.000',    otros: '$50.000',  total: '$920.000',   estado: 'Con traslado'     },
  { expediente: 'EXP-2024-00892', cliente: 'Construcciones Del Valle S.R.L.', fecha: '05/08/2026', fechaDesde: '03/09/2024', fechaHasta: '05/08/2026', capital: '$4.200.000', intereses: '$700.000',   otros: '$200.000', total: '$5.100.000', estado: 'Aprobada / firme' },
  { expediente: 'EXP-2024-00531', cliente: 'Acme S.A.',                       fecha: '15/08/2026', fechaDesde: '12/09/2024', fechaHasta: '15/08/2026', capital: '$6.400.000', intereses: '$1.400.000', otros: '$300.000', total: '$8.100.000', estado: 'Aprobada / firme' },
];

const MOCK_TODOS_PAGOS = [
  { expediente: 'EXP-2025-00412', cliente: 'López Hnos. S.R.L.',              fecha: '10/08/2026', concepto: 'Costas',     pagador: 'EMPRESA',                       monto: '$2.300.000', medio: 'Transferencia bancaria', referencia: 'TRF-2026-00891', estado: 'Parcial'               },
  { expediente: 'EXP-2026-00087', cliente: 'García, Juan Carlos',              fecha: '15/07/2026', concepto: 'Honorarios', pagador: 'Estado Nacional',               monto: '$740.000',   medio: 'Cheque',                 referencia: 'CHQ-2026-00234', estado: 'Pendiente de acreditar'},
  { expediente: 'EXP-2025-00198', cliente: 'Rodríguez, María Elena',           fecha: '30/06/2026', concepto: 'Capital',    pagador: 'EMPRESA',                       monto: '$1.050.000', medio: 'Transferencia bancaria', referencia: 'TRF-2026-00567', estado: 'Acreditado'            },
  { expediente: 'EXP-2025-00731', cliente: 'Martínez, Roberto',                fecha: '20/07/2026', concepto: 'Capital',    pagador: 'Tercero / codemandado',         monto: '$2.580.000', medio: 'Transferencia bancaria', referencia: 'TRF-2026-00712', estado: 'Acreditado'            },
  { expediente: 'EXP-2024-00892', cliente: 'Construcciones Del Valle S.R.L.',  fecha: '12/08/2026', concepto: 'Capital',    pagador: 'EMPRESA',                       monto: '$5.100.000', medio: 'Transferencia bancaria', referencia: 'TRF-2026-00834', estado: 'Pendiente de acreditar'},
  { expediente: 'EXP-2024-00531', cliente: 'Acme S.A.',                        fecha: '15/08/2026', concepto: 'Capital',    pagador: 'Estado Nacional',               monto: '$8.100.000', medio: 'Transferencia bancaria', referencia: 'TRF-2026-00901', estado: 'Acreditado'            },
];

const BADGE_ESTADO: Record<string, { label: string; classes: string; dot: string }> = {
  'Registrado':          { label: 'Registrado',          classes: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400'   },
  'En seguimiento':      { label: 'En seguimiento',      classes: 'bg-blue-100 text-blue-600',    dot: 'bg-blue-500'   },
  'Con previsión':       { label: 'Con previsión',       classes: 'bg-indigo-100 text-indigo-600',dot: 'bg-indigo-500' },
  'Listo para impulsar': { label: 'Listo para impulsar', classes: 'bg-warning/10 text-warning',   dot: 'bg-warning'    },
  'Impulsado':           { label: 'Impulsado',           classes: 'bg-purple-100 text-purple-600',dot: 'bg-purple-500' },
  'Pagado':              { label: 'Pagado',              classes: 'bg-success/10 text-success',   dot: 'bg-success'    },
  'Acreditado':          { label: 'Acreditado',          classes: 'bg-teal-100 text-teal-600',    dot: 'bg-teal-500'   },
  'Cerrado':             { label: 'Cerrado',             classes: 'bg-gray-100 text-gray-400',    dot: 'bg-gray-300'   },
};

@Component({
  selector: 'app-prevision-list',
  standalone: true,
  imports: [CommonModule, UiTable, UiPagination, UiBadge, UiInput, UiSelect, PrimaryBtn, ModalPrevisionAltaGlobal],
  templateUrl: './prevision-list.html',
})
export class PrevisionList {
  private router = inject(Router);
  tab = signal<'previsiones' | 'liquidaciones' | 'pagos'>('previsiones');

  modalAltaOpen = false;

  // Filtros
  filtros = { expediente: '', cliente: '', estado: '', concepto: '', modo: '' };

  estadoOptions = [
    { value: 'Registrado',           label: 'Registrado'           },
    { value: 'En seguimiento',       label: 'En seguimiento'       },
    { value: 'Con previsión',        label: 'Con previsión'        },
    { value: 'Listo para impulsar',  label: 'Listo para impulsar'  },
    { value: 'Impulsado',            label: 'Impulsado'            },
    { value: 'Pagado',               label: 'Pagado'               },
    { value: 'Acreditado',           label: 'Acreditado'           },
    { value: 'Cerrado',              label: 'Cerrado'              },
  ];

  conceptoOptions = [
    { value: 'Capital',                   label: 'Capital'                   },
    { value: 'Intereses',                 label: 'Intereses'                 },
    { value: 'Honorarios',                label: 'Honorarios'                },
    { value: 'IVA',                       label: 'IVA'                       },
    { value: 'Costas',                    label: 'Costas'                    },
    { value: 'Multa',                     label: 'Multa'                     },
    { value: 'Art. 730',                  label: 'Art. 730'                  },
    { value: 'Depósito de queja',         label: 'Depósito de queja'         },
    { value: 'Otro',                      label: 'Otro'                      },
  ];

  modoOptions = [
    { value: 'Activo',      label: 'Activo'      },
    { value: 'Seguimiento', label: 'Seguimiento' },
  ];

  // Filtros liquidaciones
  filtrosLiquidaciones = {
    expediente: '',
    cliente: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  };

  estadoLiquidacionOptions = [
    { value: 'Practicada',       label: 'Practicada'       },
    { value: 'Impugnada',        label: 'Impugnada'        },
    { value: 'Con traslado',     label: 'Con traslado'     },
    { value: 'Aprobada / firme', label: 'Aprobada / firme' },
  ];

  limpiarFiltrosLiquidaciones() {
    this.filtrosLiquidaciones = { expediente: '', cliente: '', estado: '', fechaDesde: '', fechaHasta: '' };
  }

  filtrosPagos = {
    expediente: '',
    cliente: '',
    pagador: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  };

  estadoPagoOptions = [
    { value: 'Parcial',               label: 'Parcial'               },
    { value: 'Total',                 label: 'Total'                 },
    { value: 'Pendiente de acreditar',label: 'Pendiente de acreditar'},
    { value: 'Acreditado',            label: 'Acreditado'            },
  ];

  limpiarFiltrosPagos() {
    this.filtrosPagos = { expediente: '', cliente: '', pagador: '', estado: '', fechaDesde: '', fechaHasta: '' };
  }

  // 🔴 MOCK — derivar del backend cuando esté disponible
  stats = {
    activas:        6,
    totalPrevisto:  '$31.230.000',
    pendientesPago: 3,
    pagadas:        2,
  };

  get previsionesFiltradas() {
    return MOCK_PREVISIONES.filter(p =>
      (!this.filtros.expediente || p.expediente.toLowerCase().includes(this.filtros.expediente.toLowerCase())) &&
      (!this.filtros.cliente    || p.cliente.toLowerCase().includes(this.filtros.cliente.toLowerCase())) &&
      (!this.filtros.estado     || p.estado === this.filtros.estado) &&
      (!this.filtros.concepto   || p.concepto === this.filtros.concepto) &&
      (!this.filtros.modo       || p.modo === this.filtros.modo)
    );
  }

  limpiarFiltros() {
    this.filtros = { expediente: '', cliente: '', estado: '', concepto: '', modo: '' };
  }

  badgeConfig = BADGE_ESTADO;

  columns: TableColumn[] = [
    { key: 'expediente',       label: 'Expediente',        type: 'text' },
    { key: 'cliente',          label: 'Cliente',           type: 'text' },
    { key: 'concepto',         label: 'Concepto',          type: 'text' },
    { key: 'modo',             label: 'Modo',              type: 'badge',
      badgeConfig: {
        'Activo':      { label: 'Activo',      classes: 'bg-primary/10 text-primary',  dot: 'bg-primary'  },
        'Seguimiento': { label: 'Seguimiento', classes: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
      }
    },
    { key: 'fechaResolucion',  label: 'Fecha resolución',  type: 'text' },
    { key: 'montoBase',        label: 'Monto base',        type: 'text' },
    { key: 'montoPrevisto',    label: 'Monto previsto',    type: 'text' },
    { key: 'ultimaLiquidacion',label: 'Última liquidación',type: 'text' },
    {
      key: 'estado', label: 'Estado', type: 'badge',
      badgeConfig: BADGE_ESTADO,
    },
    {
      key: 'acciones', label: 'Acciones', type: 'actions',
      getActions: () => ['view'] as any,
    },
  ];

  onAction(event: { type: string; row: any }) {
    if (event.type === 'view') this.router.navigate(['/prevision-y-pago', event.row.id]);
  }
  
  todasLiquidaciones = MOCK_TODAS_LIQUIDACIONES;
  todosPagos = MOCK_TODOS_PAGOS;

  columnsLiquidaciones: TableColumn[] = [
    { key: 'expediente',     label: 'Expediente',       type: 'text' },
    { key: 'cliente',        label: 'Cliente',          type: 'text' },
    { key: 'fecha',          label: 'Fecha liquidación', type: 'text' },
    { key: 'fechaDesde',     label: 'Fecha desde',      type: 'text' },
    { key: 'fechaHasta',     label: 'Fecha hasta',      type: 'text' },
    { key: 'capital',        label: 'Monto base',       type: 'text' },
    { key: 'intereses',      label: 'Intereses',        type: 'text' },
    { key: 'otros',          label: 'Otros conceptos',  type: 'text' },
    { key: 'total',          label: 'Total',            type: 'text' },
    { key: 'estado',         label: 'Estado',           type: 'badge',
      badgeConfig: {
        'Practicada':       { label: 'Practicada',       classes: 'bg-blue-100 text-blue-600',    dot: 'bg-blue-500'   },
        'Impugnada':        { label: 'Impugnada',        classes: 'bg-danger/10 text-danger',     dot: 'bg-danger'     },
        'Con traslado':     { label: 'Con traslado',     classes: 'bg-warning/10 text-warning',   dot: 'bg-warning'    },
        'Aprobada / firme': { label: 'Aprobada / firme', classes: 'bg-success/10 text-success',   dot: 'bg-success'    },
      }
    },
  ];

  columnsPagos: TableColumn[] = [
    { key: 'expediente', label: 'Expediente',    type: 'text' },
    { key: 'cliente',    label: 'Cliente',       type: 'text' },
    { key: 'fecha',      label: 'Fecha de pago', type: 'text' },
    { key: 'concepto',   label: 'Concepto',      type: 'text' },
    { key: 'pagador',    label: 'Pagador',       type: 'text' },
    { key: 'monto',      label: 'Monto',         type: 'text' },
    { key: 'medio',      label: 'Medio de pago', type: 'text' },
    { key: 'referencia', label: 'Referencia',    type: 'text' },
    { key: 'estado',     label: 'Estado',        type: 'badge',
      badgeConfig: {
        'Parcial':                { label: 'Parcial',                classes: 'bg-warning/10 text-warning',   dot: 'bg-warning'  },
        'Total':                  { label: 'Total',                  classes: 'bg-success/10 text-success',   dot: 'bg-success'  },
        'Pendiente de acreditar': { label: 'Pendiente de acreditar', classes: 'bg-blue-100 text-blue-600',    dot: 'bg-blue-500' },
        'Acreditado':             { label: 'Acreditado',             classes: 'bg-teal-100 text-teal-600',    dot: 'bg-teal-500' },
      }
    },
  ];
}