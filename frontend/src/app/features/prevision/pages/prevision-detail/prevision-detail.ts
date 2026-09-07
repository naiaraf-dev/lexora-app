import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';
import { ModalLiquidacion } from '../../components/modal-liquidacion/modal-liquidacion';
import { ModalPago } from '../../components/modal-pago/modal-pago';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';

// 🔴 MOCK
const MOCK_PREVISION = {
  expediente:              'EXP-2026-00123',
  tipo:                    'Demanda Civil',
  cliente:                 'Empresa Constructora S.A.',
  caratula:                'Empresa Constructora S.A. c/ Provincia s/ daños y perjuicios',
  area:                    'Civil',
  estado:                  'Listo para impulsar',
  estadoClase:             'bg-warning/10 text-warning',
  montoSentencia:          '$5.000.000',
  montoPrevisto:           '$7.350.000',
  ultimaLiquidacion:       '$7.350.000',
  saldoPendiente:          '$7.350.000',
  modo:                    'Activo',
  tipoObligacion:          'Sentencia',
  fechaResolucion:         '10/06/2026',
  fechaFirmeza:            '25/06/2026',
  fechaLimitePrevisionar:  '10/07/2026',
  fuero:                   'Civil / Comercial',
  obligado:                'EMPRESA',
  pagadorEfectivo:         'EMPRESA',
  jurisdiccion:            'Dirección General de Asuntos Jurídicos',
  ejercicio:               '2026',
  montoBase:               '$5.000.000',
  fechaActualizacion:      '16/08/2026',
  observaciones:           'Previsión actualizada con tasa vigente al mes de agosto.',
  observacionesSentencia:  'Sentencia definitiva dictada en primera instancia. Pendiente de apelación.',
  concepto:                'Capital',
  fechaBase:               '10/06/2026',
  fechaEstimadaPago:       '31/12/2026',
  fechaSentencia:          '10/06/2026',
  tipoSentencia:           'Definitiva',
};

const MOCK_ITEMS = [
  { concepto: 'Capital',    monto: '$5.000.000', obligado: 'EMPRESA', estado: 'Con previsión' },
  { concepto: 'Intereses',  monto: '$2.200.000', obligado: 'EMPRESA', estado: 'Con previsión' },
  { concepto: 'Otros',      monto: '$150.000',   obligado: 'EMPRESA', estado: 'Con previsión' },
];

const MOCK_LIQUIDACIONES = [
  { numero: 1, fecha: '16/08/2026', periodo: 'Jun 2026 – Ago 2026', capital: '$5.000.000', intereses: '$1.200.000', otros: '$150.000', total: '$7.350.000', estado: 'Vigente' },
  { numero: 0, fecha: '01/06/2026', periodo: 'Jun 2026',            capital: '$5.000.000', intereses: '$800.000',   otros: '$0',       total: '$5.800.000', estado: 'Reemplazada' },
];

const MOCK_PAGOS: any[] = [];

interface TimelineEvent {
  fecha: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

const MOCK_TIMELINE: TimelineEvent[] = [
  { fecha: '10/07/2026', usuario: 'Juan Pérez',   accion: 'Generó liquidación inicial',  detalle: 'Monto: $6.800.000' },
  { fecha: '01/08/2026', usuario: 'María López',  accion: 'Actualizó liquidación',       detalle: 'Monto: $7.100.000' },
  { fecha: '16/08/2026', usuario: 'Juan Pérez',   accion: 'Generó nueva liquidación',    detalle: 'Monto: $7.350.000' },
];

@Component({
  selector: 'app-prevision-detail',
  standalone: true,
  imports: [CommonModule, PrimaryBtn, UiTable, ModalLiquidacion, ModalPago, FormsModule, UiInput, UiDateInput, UiSelect],
  templateUrl: './prevision-detail.html',
})
export class PrevisionDetail {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
    tab = signal<'resumen' | 'liquidaciones' | 'sentencia' | 'pagos' | 'documentos'>('resumen');
  prevision = MOCK_PREVISION;
  liquidaciones = MOCK_LIQUIDACIONES;
  pagos = MOCK_PAGOS;

  modalLiquidacionOpen = false;
  modalPagoOpen = false;

  items = MOCK_ITEMS;

  get alertas(): { tipo: string; titulo: string; descripcion: string }[] {
    const resultado: { tipo: string; titulo: string; descripcion: string }[] = [];

    // Liquidación no firme
    const ultimaLiq = this.liquidaciones[0];
    if (ultimaLiq && ultimaLiq.estado !== 'Vigente' && ultimaLiq.estado !== 'Aprobada / firme') {
      resultado.push({
        tipo: 'warning',
        titulo: 'Liquidación no firme',
        descripcion: 'El saldo no puede impulsarse hasta que la liquidación sea aprobada.',
      });
    }

    // Factura de honorarios pendiente
    if (this.tieneHonorarios && !this.facturaHonorarios.cargada) {
      resultado.push({
        tipo: 'warning',
        titulo: 'Factura de honorarios pendiente',
        descripcion: 'Para impulsar el pago de honorarios debe existir factura.',
      });
    }

    // Prorrateo aprobado sin verificar
    if (this.prorrateo.aprobado && !this.prorrateo.verificado) {
      resultado.push({
        tipo: 'warning',
        titulo: 'Prorrateo aprobado sin verificar',
        descripcion: 'Verificar resolución antes de impulsar. No usar monto original.',
      });
    }

    // Pago parcial con saldo pendiente
    if (this.pagos.length && this.prevision.estado !== 'Pagada') {
      resultado.push({
        tipo: 'info',
        titulo: 'Pago parcial con saldo pendiente',
        descripcion: 'Se registró al menos un pago pero el ítem aún no está cerrado.',
      });
    }

    // Notificación pendiente
    if (this.notificacionPendiente) {
      resultado.push({
        tipo: 'info',
        titulo: 'Notificación pendiente',
        descripcion: 'Corresponde notificar la acreditación del pago a las partes interesadas.',
      });
    }

    // Modo seguimiento con saldo a cargo de EMPRESA
    if (this.prevision.modo === 'Seguimiento' && this.pagos.length) {
      resultado.push({
        tipo: 'info',
        titulo: 'Saldo a cargo de EMPRESA',
        descripcion: 'El ítem pasa a modo activo por saldo pendiente. EMPRESA debe impulsar la diferencia.',
      });
    }

    // Obligación firme sin previsión
    if (!this.prevision.montoPrevisto || this.prevision.montoPrevisto === '$0') {
      resultado.push({
        tipo: 'warning',
        titulo: 'Obligación firme sin previsión',
        descripcion: 'Existe una obligación firme que aún no tiene monto previsto registrado.',
      });
    }

    return resultado;
  }

  columnsItems: TableColumn[] = [
    { key: 'concepto', label: 'Concepto', type: 'text' },
    { key: 'monto',    label: 'Monto',    type: 'text' },
    { key: 'obligado', label: 'Obligado', type: 'text' },
    { key: 'estado',   label: 'Estado',   type: 'badge',
      badgeConfig: {
        'Con previsión': { label: 'Con previsión', classes: 'bg-indigo-100 text-indigo-600', dot: 'bg-indigo-500' },
        'Impulsado':     { label: 'Impulsado',     classes: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' },
        'Pagado':        { label: 'Pagado',        classes: 'bg-success/10 text-success',    dot: 'bg-success'    },
      }
    },
  ];

  columnsLiquidaciones: TableColumn[] = [
    { key: 'numero',   label: 'N°',       type: 'text' },
    { key: 'fecha',    label: 'Fecha',    type: 'text' },
    { key: 'periodo',  label: 'Período',  type: 'text' },
    { key: 'capital',  label: 'Capital',  type: 'text' },
    { key: 'intereses',label: 'Intereses',type: 'text' },
    { key: 'otros',    label: 'Otros',    type: 'text' },
    { key: 'total',    label: 'Total',    type: 'text' },
    { key: 'estado',   label: 'Estado',   type: 'badge',
      badgeConfig: {
        'Vigente':      { label: 'Vigente',      classes: 'bg-success/10 text-success',  dot: 'bg-success'  },
        'Reemplazada':  { label: 'Reemplazada',  classes: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
      }
    },
  ];

  columnasPagos: TableColumn[] = [
    { key: 'fecha',     label: 'Fecha',        type: 'text' },
    { key: 'monto',     label: 'Monto',        type: 'text' },
    { key: 'medio',     label: 'Medio de pago',type: 'text' },
    { key: 'referencia',label: 'Referencia',   type: 'text' },
    { key: 'estado',    label: 'Estado',       type: 'text' },
  ];

  editando = false;

  // 🔴 MOCK — reemplazar por DocumentosService cuando esté disponible
  documentos: { nombre: string; tipo: string; fecha: string; tamanio: string }[] = [
    { nombre: 'sentencia-definitiva.pdf',    tipo: 'Sentencia',    fecha: '10/06/2026', tamanio: '2.1 MB' },
    { nombre: 'liquidacion-aprobada.pdf',    tipo: 'Liquidación',  fecha: '16/08/2026', tamanio: '840 KB' },
    { nombre: 'constancia-prevision.pdf',    tipo: 'Constancia',   fecha: '01/07/2026', tamanio: '320 KB' },
  ];

  agregarDocumento(): void {
    // 🔴 MOCK — reemplazar por modal real de carga de documento
    this.documentos = [
      ...this.documentos,
      {
        nombre:  `documento-${this.documentos.length + 1}.pdf`,
        tipo:    'Otro',
        fecha:   new Date().toLocaleDateString('es-AR'),
        tamanio: '—',
      },
    ];
    this.agregarEventoTimeline('Adjuntó documento', `documento-${this.documentos.length}.pdf`);
  }

  form = {
    concepto: MOCK_PREVISION.concepto,
    montoBase: MOCK_PREVISION.montoBase,
    fechaBase: MOCK_PREVISION.fechaBase,
    fechaEstimadaPago: MOCK_PREVISION.fechaEstimadaPago,
    observaciones: MOCK_PREVISION.observaciones,
  };

  guardando = false;

  guardar(): void {
    this.guardando = true;
    setTimeout(() => {
      this.prevision = { ...this.prevision, ...this.form };
      this.guardando = false;
      this.editando = false;
      this.agregarEventoTimeline('Editó previsión', `Monto base: ${this.form.montoBase}`);
    }, 600);
  }

  irAEditar(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/prevision-y-pago', id, 'editar']);
  }

  cancelarEdicion(): void {
    this.form = {
      concepto: this.prevision.concepto,
      montoBase: this.prevision.montoBase,
      fechaBase: this.prevision.fechaBase,
      fechaEstimadaPago: this.prevision.fechaEstimadaPago,
      observaciones: this.prevision.observaciones,
    };
    this.editando = false;
  }

  editandoSentencia = false;

    editandoProrrateo = false;

  // Factura de honorarios
  // TODO: derivar de los ítems reales cuando se conecte el backend
  get tieneHonorarios(): boolean {
    return this.items.some(item => item.concepto === 'Honorarios');
  }

  facturaHonorarios = {
    cargada:     false,
    profesional: '',
    monto:       '',
    fecha:       '',
    documento:   '',
  };

  cargarFactura(): void {
    // 🔴 MOCK — reemplazar por modal real de carga de factura
    this.facturaHonorarios = {
      cargada:     true,
      profesional: 'Dr. Carlos Méndez',
      monto:       '$850.000',
      fecha:       new Date().toLocaleDateString('es-AR'),
      documento:   'factura-honorarios.pdf',
    };
    this.agregarEventoTimeline('Cargó factura de honorarios', 'Dr. Carlos Méndez — $850.000');
  }

  prorrateo = {
    aprobado:           false,
    verificado:         false,
    fechaAprobacion:    '',
    resolucion:         '',
    baseCalculo:        '',
    honorariosSujetos:  '',
    coeficiente:        '',
    montoProrrateado:   '',
    resultado:          '',
  };

  private _prorrateoSnapshot = { ...this.prorrateo };

  guardarProrrateo(): void {
    this.prorrateo.verificado = true;
    this._prorrateoSnapshot = { ...this.prorrateo };
    this.editandoProrrateo = false;
    this.agregarEventoTimeline('Actualizó prorrateo Art. 730');
  }

  cancelarProrrateo(): void {
    this.prorrateo = { ...this._prorrateoSnapshot };
    this.editandoProrrateo = false;
  }

  formSentencia = {
    fechaSentencia:   MOCK_PREVISION.fechaSentencia,
    tipoSentencia:    MOCK_PREVISION.tipoSentencia,
    montoSentencia:   MOCK_PREVISION.montoSentencia,
    observaciones:    MOCK_PREVISION.observacionesSentencia,
    documento:        '',
  };

  tipoSentenciaOptions = [
    { value: 'Definitiva',      label: 'Definitiva'      },
    { value: 'Interlocutoria',  label: 'Interlocutoria'  },
    { value: 'Homologatoria',   label: 'Homologatoria'   },
  ];

  archivoSeleccionado: string | null = null;

  seleccionarArchivo(): void {
    // 🔴 MOCK
    this.archivoSeleccionado = 'sentencia-definitiva.pdf';
  }

  guardarSentencia(): void {
    this.prevision = {
      ...this.prevision,
      fechaSentencia:         this.formSentencia.fechaSentencia,
      tipoSentencia:          this.formSentencia.tipoSentencia,
      montoSentencia:         this.formSentencia.montoSentencia,
      observacionesSentencia: this.formSentencia.observaciones,
    };
    this.editandoSentencia = false;
  }

  cancelarSentencia(): void {
    this.formSentencia = {
      fechaSentencia:  this.prevision.fechaSentencia,
      tipoSentencia:   this.prevision.tipoSentencia,
      montoSentencia:  this.prevision.montoSentencia,
      observaciones:   this.prevision.observacionesSentencia,
      documento:       '',
    };
    this.archivoSeleccionado = null;
    this.editandoSentencia = false;
  }

  registrandoPago = false;

  onPagoGuardado(pago: any): void {
    const nuevoPago = {
      fecha: pago.fecha || new Date().toLocaleDateString('es-AR'),
      monto: pago.monto,
      medio: pago.medio,
      referencia: pago.referencia || '—',
      estado: 'Acreditado',
    };
    this.pagos = [...this.pagos, nuevoPago];
    this.prevision = {
      ...this.prevision,
      estado: 'Pagada',
      estadoClase: 'bg-success/10 text-success',
    };
    this.agregarEventoTimeline('Registró pago', `Monto: ${pago.monto}`);
    this.modalPagoOpen = false;
  }

  timeline: TimelineEvent[] = MOCK_TIMELINE;

  agregarEventoTimeline(accion: string, detalle?: string): void {
    this.timeline = [
      {
        fecha: new Date().toLocaleDateString('es-AR'),
        usuario: 'Juan Pérez',
        accion,
        detalle,
      },
      ...this.timeline,
    ];
  }

  acreditacion = {
    estado: 'Pendiente de acreditación' as 'Pendiente de acreditación' | 'Acreditado',
    fechaAcreditacion: '',
    documento: '',
    comprobante: '',
  };

  notificacionPendiente = true; // 🔴 MOCK

  generarTareaNotificacion(): void {
    this.notificacionPendiente = false;
    this.agregarEventoTimeline('Generó tarea de notificación', 'Notificación pendiente de envío');
    // TODO: conectar con módulo de Agenda/Tareas de LEXORA cuando esté disponible
  }

  volver() { this.router.navigate(['/prevision-y-pago']); }
}