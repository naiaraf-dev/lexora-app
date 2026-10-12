import { Component, signal, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UiTable, TableColumn } from '../../../../shared/components/ui-table/ui-table';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { UiSelect, UiSelectOption } from '../../../../shared/components/ui-select/ui-select';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ModalPrevisionAltaGlobal } from '../../components/modal-prevision-alta/modal-prevision-alta';
import { PrevisionService } from '../../services/prevision.service';
import { PrevisionFiltros, PrevisionResumen } from '../../models/prevision.model';
import {
  BADGE_ESTADO, BADGE_LIQUIDACION, BADGE_MODO, MODO_OPTIONS, OBLIGADO_LABEL, OBLIGADO_OPTIONS, formatFecha, formatMonto,
} from '../../models/prevision.constants';

@Component({
  selector: 'app-prevision-list',
  standalone: true,
  imports: [CommonModule, UiTable, UiInput, UiSelect, UiDateInput, PrimaryBtn, ModalPrevisionAltaGlobal],
  templateUrl: './prevision-list.html',
})
export class PrevisionList implements OnInit {
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private previsionService = inject(PrevisionService);
  private cdr = inject(ChangeDetectorRef);

  tab = signal<'previsiones' | 'liquidaciones' | 'pagos'>('previsiones');

  modalAltaOpen = false;
  cargando = false;

  /** Previsiones tal como vienen del back (se usan para las stats). */
  previsiones: PrevisionResumen[] = [];
  /** Las mismas, con montos y fechas ya formateados para la tabla. */
  filasPrevisiones: any[] = [];
  todasLiquidaciones: any[] = [];
  todosPagos: any[] = [];

  // Filtros (se mandan al back en cada cambio)
  filtros: PrevisionFiltros = { expediente: '', cliente: '', estado: '', tipoObligacion: '', modo: '' };

  estadoOptions: UiSelectOption[] = [];
  tipoObligacionOptions: UiSelectOption[] = [];
  modoOptions = MODO_OPTIONS;

  // Filtros liquidaciones
  filtrosLiquidaciones = {
    expediente: '',
    cliente: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  };

  estadoLiquidacionOptions: UiSelectOption[] = [];

  limpiarFiltrosLiquidaciones() {
    this.filtrosLiquidaciones = { expediente: '', cliente: '', estado: '', fechaDesde: '', fechaHasta: '' };
  }

  filtrosPagos = { expediente: '', cliente: '', pagador: '', fechaDesde: '', fechaHasta: '' };
  pagadorOptions = OBLIGADO_OPTIONS;

  limpiarFiltrosPagos() {
    this.filtrosPagos = { expediente: '', cliente: '', pagador: '', fechaDesde: '', fechaHasta: '' };
  }

  ngOnInit(): void {
    this.previsionService.obtenerCatalogo('estadoprevision').subscribe(o => (this.estadoOptions = o));
    this.previsionService.obtenerCatalogo('tipoobligacion').subscribe(o => (this.tipoObligacionOptions = o));
    this.previsionService.obtenerCatalogo('estadoliquidacion').subscribe(o => (this.estadoLiquidacionOptions = o));
    const exp = this.route.snapshot.queryParamMap.get('expediente');
    if (exp) this.filtros = { ...this.filtros, expediente: exp };
    this.cargarPrevisiones();
    this.cargarLiquidaciones();
    this.cargarPagos();
  }

  cargarPrevisiones(): void {
    this.cargando = true;
    this.previsionService.listar(this.filtros).subscribe(lista => {
      this.previsiones = lista;
      this.filasPrevisiones = lista.map(p => ({
        ...p,
        fechaResolucion: formatFecha(p.fechaResolucion),
        montoPrevisto: formatMonto(p.montoPrevisto),
        saldo: formatMonto(p.saldo),
        obligadoNombre: `${p.obligadoNombre} (${OBLIGADO_LABEL[p.obligado]})`,
      }));
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  private cargarLiquidaciones(): void {
    this.previsionService.listarLiquidaciones().subscribe(lista => {
      this.todasLiquidaciones = lista.map(l => ({
        ...l,
        fechaLiquidacion: formatFecha(l.fechaLiquidacion),
        fechaDesde: formatFecha(l.fechaDesde),
        fechaHasta: formatFecha(l.fechaHasta),
        capital: formatMonto(l.capital),
        intereses: formatMonto(l.intereses),
        otros: formatMonto(l.otros),
        total: formatMonto(l.total),
        vigente: l.vigente ? 'Sí' : 'No',
      }));
      this.cdr.detectChanges();
    });
  }

  private cargarPagos(): void {
    this.previsionService.listarPagos().subscribe(lista => {
      this.todosPagos = lista.map(x => ({
        ...x,
        fechaPago: formatFecha(x.fechaPago),
        monto: formatMonto(x.monto),
        pagador: x.pagadorDetalle ?? OBLIGADO_LABEL[x.pagador],
        referencia: x.referencia ?? '—',
      }));
      this.cdr.detectChanges();
    });
  }

  onFiltroChange(campo: keyof PrevisionFiltros, valor: any): void {
    this.filtros = { ...this.filtros, [campo]: valor };
    this.cargarPrevisiones();
  }

  limpiarFiltros() {
    this.filtros = { expediente: '', cliente: '', estado: '', tipoObligacion: '', modo: '' };
    this.cargarPrevisiones();
  }

  /** Stats calculadas sobre lo que devolvió el listado. */
  get stats() {
    const abiertas = this.previsiones.filter(p => p.estado !== 'Cerrado');
    return {
      activas: abiertas.length,
      totalPrevisto: formatMonto(abiertas.reduce((s, p) => s + p.montoPrevisto, 0)),
      pendientesPago: this.previsiones.filter(p => p.estado === 'Listo para impulsar' || p.estado === 'Impulsado').length,
      pagadas: this.previsiones.filter(p => ['Pagado', 'Acreditado', 'Cerrado'].includes(p.estado)).length,
    };
  }

  columns: TableColumn[] = [
    { key: 'expedienteNumero', label: 'Expediente',        type: 'text' },
    { key: 'cliente',          label: 'Cliente',           type: 'text' },
    { key: 'tipoObligacion',   label: 'Obligación',        type: 'text' },
    { key: 'obligadoNombre',   label: 'Obligado',          type: 'text' },
    { key: 'modo',             label: 'Modo',              type: 'badge', badgeConfig: BADGE_MODO },
    { key: 'fechaResolucion',  label: 'Fecha resolución',  type: 'text' },
    { key: 'montoPrevisto',    label: 'Monto previsto',    type: 'text' },
    { key: 'saldo',            label: 'Saldo',             type: 'text' },
    { key: 'estado',           label: 'Estado',            type: 'badge', badgeConfig: BADGE_ESTADO },
    { key: 'acciones',         label: 'Acciones',          type: 'actions', getActions: () => ['view'] },
  ];

  onAction(event: { type: string; row: any }) {
    if (event.type === 'view') this.router.navigate(['/prevision-y-pago', event.row.id]);
  }

  columnsLiquidaciones: TableColumn[] = [
    { key: 'expedienteNumero', label: 'Expediente',        type: 'text' },
    { key: 'cliente',          label: 'Cliente',           type: 'text' },
    { key: 'fechaLiquidacion', label: 'Fecha liquidación', type: 'text' },
    { key: 'fechaDesde',       label: 'Desde',             type: 'text' },
    { key: 'fechaHasta',       label: 'Hasta',             type: 'text' },
    { key: 'capital',          label: 'Capital',           type: 'text' },
    { key: 'intereses',        label: 'Intereses',         type: 'text' },
    { key: 'otros',            label: 'Otros',             type: 'text' },
    { key: 'total',            label: 'Total',             type: 'text' },
    { key: 'estadoLiquidacion', label: 'Estado',           type: 'badge', badgeConfig: BADGE_LIQUIDACION },
    { key: 'vigente',          label: 'Vigente',           type: 'text' },
  ];

  columnsPagos: TableColumn[] = [
    { key: 'expedienteNumero', label: 'Expediente',    type: 'text' },
    { key: 'cliente',          label: 'Cliente',       type: 'text' },
    { key: 'fechaPago',        label: 'Fecha de pago', type: 'text' },
    { key: 'pagador',          label: 'Pagador',       type: 'text' },
    { key: 'monto',            label: 'Monto',         type: 'text' },
    { key: 'medioPago',        label: 'Medio de pago', type: 'text' },
    { key: 'referencia',       label: 'Referencia',    type: 'text' },
  ];
}