import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { toast } from 'ngx-sonner';
import { environment } from '../../../../../environments/environment';
import { TASAS_CONFIG, getTasaConfig, GrupoTasa } from '../../models/tasas-config';

interface Tramo {
  id: string;
  desde: string;
  hasta: string;
  tasa: string;
  resultado: string;
}

interface DetalleTrazabilidad {
  montoBase: string;
  fechaDesde: string;
  fechaHasta: string;
  tasaSeleccionada: string;
  tasaValor: string;
  tasaFechaPublicacion: string;
  fuente: string;
  metodologia: string;
  fechaCalculo: string;
}

@Component({
  selector: 'app-modal-liquidacion',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiDateInput, PrimaryBtn, UiSelect],
  templateUrl: './modal-liquidacion.html',
})
export class ModalLiquidacion {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();

  private http = inject(HttpClient);

  guardando = false;
  calculado = false;
  calculando = false;
  errorTasa = '';

  form = {
    fechaLiquidacion: '',
    fechaDesde: '',
    fechaHasta: '',
    montoBase: '',
    tipoTasa: '',
    otrosConceptos: '',
    observaciones: '',
  };

  // Catálogo real de tasas (viene de tasas-config.ts, que refleja lo que el back puede consultar en CPACF)
  tipoTasaOptions = TASAS_CONFIG.map(t => ({ value: t.nombre, label: t.nombre }));

  get grupoTasaSeleccionada(): GrupoTasa | null {
    const cfg = getTasaConfig(this.form.tipoTasa);
    return cfg?.grupo ?? null;
  }

  // Ítems calculadora propia (Grupo C) — placeholder, no se calcula por scraping
  esCalculadoraPropia(): boolean {
    return this.grupoTasaSeleccionada === 'CALCULADORA';
  }

  tramos: Tramo[] = [
    { id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }
  ];

  agregarTramo(): void {
    this.tramos = [...this.tramos, { id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }];
  }

  eliminarTramo(id: string): void {
    if (this.tramos.length === 1) return;
    this.tramos = this.tramos.filter(t => t.id !== id);
  }

  calculo = { capital: '', intereses: '', otros: '', total: '' };
  detalle: DetalleTrazabilidad | null = null;

  calcular() {
    this.errorTasa = '';

    if (!this.form.tipoTasa) {
      toast.error('Seleccioná una tasa');
      return;
    }
    if (!this.form.montoBase) {
      toast.error('Ingresá el monto base');
      return;
    }

    const grupo = this.grupoTasaSeleccionada;

    if (grupo === 'CALCULADORA') {
      toast.error('Esta tasa requiere una calculadora especial — todavía no está implementada en el sistema');
      return;
    }

    this.calculando = true;

    // Consulta real al back → back hace scraping (con caché de 1h) al CPACF
    this.http.get<{ nombre: string; fecha: string; valor: number }>(
      `${environment.apiUrl}/tasa`,
      { params: { nombre: this.form.tipoTasa } }
    ).subscribe({
      next: (res) => {
        this.calculando = false;
        this.procesarResultado(res, grupo!);
      },
      error: (err) => {
        this.calculando = false;
        this.errorTasa = err.error?.error ?? 'No se pudo consultar la tasa en el CPACF';
        toast.error(this.errorTasa);
      }
    });
  }

  private procesarResultado(tasaRes: { nombre: string; fecha: string; valor: number }, grupo: GrupoTasa) {
    const montoBase = this.parseMonto(this.form.montoBase);
    const otros = this.parseMonto(this.form.otrosConceptos);

    let intereses = 0;
    let metodologia = '';

    if (grupo === 'SIMPLE') {
      // Grupo A: solo informativo — no calcula interés sobre período, muestra el valor vigente
      intereses = 0;
      metodologia = `Consulta directa — valor vigente de "${tasaRes.nombre}" al ${tasaRes.fecha}, sin cómputo de período. Esta tasa es de tipo índice/referencia.`;
    } else {
      // Grupo B: aproximación de interés simple usando la tasa vigente traída del CPACF
      const dias = this.calcularDias(this.form.fechaDesde, this.form.fechaHasta);
      const tasaAnualDecimal = tasaRes.valor / 100;
      intereses = montoBase * tasaAnualDecimal * (dias / 365);
      metodologia = `Aproximación de interés simple: Capital × Tasa vigente (${tasaRes.valor}%) × (días/365). Días del período: ${dias}. Esta es una aproximación — no reproduce el cálculo compuesto exacto de la calculadora del Colegio de Abogados.`;
    }

    const total = montoBase + intereses + otros;

    this.calculo = {
      capital:   this.formatMonto(montoBase),
      intereses: this.formatMonto(intereses),
      otros:     this.formatMonto(otros),
      total:     this.formatMonto(total),
    };

    this.detalle = {
      montoBase:            this.formatMonto(montoBase),
      fechaDesde:           this.form.fechaDesde || '—',
      fechaHasta:           this.form.fechaHasta || '—',
      tasaSeleccionada:     tasaRes.nombre,
      tasaValor:            `${tasaRes.valor}%`,
      tasaFechaPublicacion: tasaRes.fecha,
      fuente:               'CPACF — Calculadora del Colegio de Abogados (consulta en vivo, caché 1h)',
      metodologia,
      fechaCalculo:         new Date().toLocaleDateString('es-AR'),
    };

    this.calculado = true;
    toast.success('Cálculo generado');
  }

  private parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = valor.replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }

  private formatMonto(n: number): string {
    return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  private calcularDias(desde: string, hasta: string): number {
    if (!desde || !hasta) return 0;
    const d1 = new Date(desde).getTime();
    const d2 = new Date(hasta).getTime();
    return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  guardar() {
    this.guardando = true;
    // 🔴 MOCK — reemplazar por PrevisionService.crearLiquidacion() cuando exista el endpoint
    setTimeout(() => {
      this.guardando = false;
      toast.success('Liquidación guardada correctamente');
      this.tramos = [{ id: crypto.randomUUID(), desde: '', hasta: '', tasa: '', resultado: '' }];
      this.calculado = false;
      this.cerrar.emit();
    }, 800);
  }
}