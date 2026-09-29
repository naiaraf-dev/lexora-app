import { Component, signal, inject, ChangeDetectorRef } from '@angular/core';
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
import { ModalVerComprobante } from '../../components/modal-ver-comprobante/modal-ver-comprobante';

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
  concepto:                'Capital',
  fechaBase:               '10/06/2026',
  fechaEstimadaPago:       '31/12/2026',
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
  imports: [CommonModule, PrimaryBtn, UiTable, ModalLiquidacion, ModalPago, ModalVerComprobante, FormsModule, UiInput, UiDateInput, UiSelect],
  templateUrl: './prevision-detail.html',
})
export class PrevisionDetail {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);

  tab = signal<'resumen' | 'liquidaciones' | 'pagos' | 'historial'>('resumen');
  prevision = MOCK_PREVISION;
  liquidaciones = MOCK_LIQUIDACIONES;
  pagos = MOCK_PAGOS;

  modalLiquidacionOpen = false;
  modalPagoOpen = false;

  modalComprobanteOpen = false;
  comprobanteAVer: { nombre: string; url: string } | null = null;

  verComprobante(pago: any): void {
    if (!pago.comprobante) return;
    this.comprobanteAVer = {
      nombre: pago.comprobante.name ?? pago.comprobante,
      url: pago.comprobante instanceof File ? URL.createObjectURL(pago.comprobante) : pago.comprobante,
    };
    this.modalComprobanteOpen = true;
    this.cdr.detectChanges();
  }

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

  /**
 * Motor de estados según sección 6.2 del documento funcional.
 * El usuario NO elige "Listo para impulsar" ni "Pagado" — el sistema los calcula
 * en base a las condiciones reales del ítem/previsión.
 */
  get estadoCalculado(): string {
    // Si ya está acreditado y no hay pendientes → Cerrado
    if (this.acreditacion.estado === 'Acreditado' && !this.notificacionPendiente && !this.pagos.length) {
      return 'Cerrado';
    }

    // Si está acreditado pero puede haber notificación pendiente
    if (this.acreditacion.estado === 'Acreditado') {
      return 'Acreditado';
    }

    // Si hay al menos un pago registrado pero no acreditado
    if (this.pagos.length > 0) {
      return 'Pagado';
    }

    // Modo Seguimiento nunca calcula "Listo para impulsar" (esa etapa es solo modo Activo)
    if (this.prevision.modo === 'Seguimiento') {
      return 'En seguimiento';
    }

    // Modo Activo: "Listo para impulsar" = Con previsión + documentación completa + factura (si hay honorarios)
    const liquidacionFirme = this.liquidaciones[0]?.estado === 'Vigente' || this.liquidaciones[0]?.estado === 'Aprobada / firme';
    const facturaOk = !this.tieneHonorarios || this.facturaHonorarios.cargada;

    if (this.prevision.montoPrevisto && this.prevision.montoPrevisto !== '$0' && liquidacionFirme && facturaOk) {
      return 'Listo para impulsar';
    }

    // Hay previsión cargada pero todavía bloqueada por algo
    if (this.prevision.montoPrevisto && this.prevision.montoPrevisto !== '$0') {
      return 'Con previsión';
    }

    return 'Registrado';
  }

  get estadoCalculadoClase(): string {
    const map: Record<string, string> = {
      'Registrado':          'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',
      'En seguimiento':      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      'Con previsión':       'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
      'Listo para impulsar': 'bg-warning/10 text-warning',
      'Impulsado':           'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      'Pagado':              'bg-success/10 text-success',
      'Acreditado':          'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
      'Cerrado':             'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400',
    };
    return map[this.estadoCalculado] ?? map['Registrado'];
  }

  /**
 * Marcas según sección 6.3 del documento funcional — condiciones que pueden coexistir,
 * a diferencia del estado principal (uno solo por vez).
 */
  get marcas(): { label: string; clase: string }[] {
    const resultado: { label: string; clase: string }[] = [];

    const docCompleta = this.items.every(i => i.estado !== 'Registrado');
    resultado.push(
      docCompleta
        ? { label: 'Documentación completa', clase: 'bg-success/10 text-success' }
        : { label: 'Observada', clase: 'bg-danger/10 text-danger' }
    );

    if (this.prorrateo.aprobado) {
      resultado.push({ label: 'Con prorrateo art. 730 aplicado', clase: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' });
    }

    if (this.pagos.length > 0) {
      resultado.push({ label: 'Pago de tercero informado', clase: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' });
    }

    if (this.tieneHonorarios && this.facturaHonorarios.cargada) {
      resultado.push({ label: 'Factura cargada', clase: 'bg-success/10 text-success' });
    }

    const liquidacionFirme = this.liquidaciones[0]?.estado === 'Vigente' || this.liquidaciones[0]?.estado === 'Aprobada / firme';
    if (!liquidacionFirme) {
      resultado.push({ label: 'Liquidación no firme', clase: 'bg-warning/10 text-warning' });
    }

    if (this.notificacionPendiente) {
      resultado.push({ label: 'Notificación pendiente', clase: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' });
    }

    return resultado;
  }

  columnsItems: TableColumn[] = [
    { key: 'concepto', label: 'Concepto', type: 'text' },
    { key: 'monto',    label: 'Monto',    type: 'text' },
    { key: 'obligado', label: 'Obligado', type: 'text' },
    { key: 'estado',   label: 'Estado',   type: 'badge',
      badgeConfig: {
        'Con previsión': { label: 'Con previsión', classes: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
        'Impulsado':     { label: 'Impulsado',     classes: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
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
        'Reemplazada':  { label: 'Reemplazada',  classes: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',   dot: 'bg-gray-400' },
      }
    },
  ];

  editando = false;

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

  registrandoPago = false;

  onPagoGuardado(pago: any): void {
    const nuevoPago = {
      fecha: pago.fecha || new Date().toLocaleDateString('es-AR'),
      monto: pago.monto,
      medio: pago.medio,
      referencia: pago.referencia || '—',
      estado: 'Acreditado',
      comprobante: pago.comprobante,
    };
    this.pagos = [...this.pagos, nuevoPago];
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