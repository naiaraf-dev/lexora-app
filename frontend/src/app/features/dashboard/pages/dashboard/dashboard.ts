import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface StatCard {
  icon: 'folder' | 'clock' | 'alert' | 'check';
  value: number;
  label: string;
  color: 'primary' | 'warning' | 'danger' | 'success';
}

interface EstadoSlice {
  label: string;
  count: number;
  color: string;
}

interface AreaSlice {
  label: string;
  count: number;
  color: string;
}

interface TipoSlice {
  label: string;
  count: number;
  color: string;
}

interface MesData {
  mes: string;
  nuevos: number;
  cerrados: number;
}

interface AbogadoRow {
  nombre: string;
  expedientes: number;
  pendientes: number;
  vencidas: number;
  cumplidas: number;
  cumplimiento: number;
}

interface Vencimiento {
  tipo: 'warning' | 'danger';
  titulo: string;
  expediente: string;
  abogado: string;
  fecha: string;
  vencida: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  stats: StatCard[] = [
    { icon: 'folder', value: 197, label: 'Expedientes totales',  color: 'primary'  },
    { icon: 'clock',  value: 34,  label: 'Tareas pendientes',    color: 'warning'  },
    { icon: 'alert',  value: 7,   label: 'Tareas vencidas',      color: 'danger'   },
    { icon: 'check',  value: 156, label: 'Tareas cumplidas',     color: 'success'  },
  ];

  estadoSlices: EstadoSlice[] = [
    { label: 'En trámite',            count: 68,  color: '#2B3A52' },
    { label: 'Paralizado',            count: 24,  color: '#E8A838' },
    { label: 'Sentencia favorable',   count: 32,  color: '#48BB78' },
    { label: 'Sentencia desfavorable',count: 18,  color: '#F56565' },
    { label: 'Archivado',             count: 55,  color: '#A0AEC0' },
  ];

  areaSlices: AreaSlice[] = [
    { label: 'Civil',      count: 55,  color: '#2B3A52' },
    { label: 'Laboral',    count: 42,  color: '#48BB78' },
    { label: 'Penal',      count: 28,  color: '#F56565' },
    { label: 'Comercial',  count: 35,  color: '#E8A838' },
    { label: 'Sucesión',   count: 20,  color: '#B7791F' },
    { label: 'Familia',    count: 17,  color: '#9F7AEA' },
  ];

  tipoSlices: TipoSlice[] = [
    { label: 'Cobro de cánones',      count: 55,  color: '#2B3A52' },
    { label: 'Denuncias',             count: 42,  color: '#48BB78' },
    { label: 'Querellas',             count: 28,  color: '#F56565' },
    { label: 'Demandas Penales',      count: 35,  color: '#E8A838' },
    { label: 'Demandas Civiles',      count: 20,  color: '#B7791F' },
    { label: 'Carta documento',       count: 17,  color: '#9F7AEA' },
  ];

  meses: MesData[] = [
    { mes: 'Jul', nuevos: 8,  cerrados: 6  },
    { mes: 'Ago', nuevos: 12, cerrados: 9  },
    { mes: 'Sep', nuevos: 10, cerrados: 11 },
    { mes: 'Oct', nuevos: 16, cerrados: 8  },
    { mes: 'Nov', nuevos: 17, cerrados: 14 },
    { mes: 'Dic', nuevos: 9,  cerrados: 13 },
    { mes: 'Ene', nuevos: 15, cerrados: 10 },
    { mes: 'Feb', nuevos: 21, cerrados: 15 },
  ];

  abogados: AbogadoRow[] = [
    { nombre: 'Dra. López',     expedientes: 32, pendientes: 8,  vencidas: 2, cumplidas: 5, cumplimiento: 81 },
    { nombre: 'Dr. García',     expedientes: 28, pendientes: 12, vencidas: 2, cumplidas: 3, cumplimiento: 87 },
    { nombre: 'Dra. Fernández', expedientes: 25, pendientes: 6,  vencidas: 0, cumplidas: 6, cumplimiento: 92 },
  ];

  vencimientos: Vencimiento[] = [
    { tipo: 'warning', titulo: 'Presentar escrito de demanda',      expediente: '1234/2024 - Pérez c/ López',        abogado: 'Dr. Martínez',  fecha: '25/02/2026', vencida: false },
    { tipo: 'warning', titulo: 'Contestar traslado de documental',  expediente: '4321/2024 - Gómez c/ Banco Nación', abogado: 'Dra. López',    fecha: '26/02/2026', vencida: false },
    { tipo: 'danger',  titulo: 'Pericia contable - seguimiento',    expediente: '2145/2025 - López c/ Seguros SA',   abogado: 'Dra. Fernández',fecha: '22/02/2026', vencida: true  },
  ];

  // ── SVG helpers ──────────────────────────────────────────────────────────

  get totalEstado(): number {
    return this.estadoSlices.reduce((s, x) => s + x.count, 0);
  }

  get totalArea(): number {
    return this.areaSlices.reduce((s, x) => s + x.count, 0);
  }

  get totalTipo(): number {
    return this.tipoSlices.reduce((s, x) => s + x.count, 0);
  }

  buildDonut(slices: { count: number; color: string }[], total: number, r = 70, cx = 90, cy = 90) {
    const circum = 2 * Math.PI * r;
    let offset = 0;
    return slices.map(s => {
      const dash = (s.count / total) * circum;
      const gap  = circum - dash;
      const seg  = { dash, gap, offset, color: s.color };
      offset += dash;
      return seg;
    });
  }

  get estadoSegments() { return this.buildDonut(this.estadoSlices, this.totalEstado); }
  get areaSegments()   { return this.buildDonut(this.areaSlices,   this.totalArea);   }
  get tipoSegments()   { return this.buildDonut(this.tipoSlices,   this.totalTipo);   }

  // Line chart helpers
  readonly CHART_W = 1100;
  readonly CHART_H = 160;
  readonly PAD_L   = 30;
  readonly PAD_R   = 20;
  readonly PAD_T   = 16;
  readonly PAD_B   = 28;

  private scaleX(i: number): number {
    const w = this.CHART_W - this.PAD_L - this.PAD_R;
    return this.PAD_L + (i / (this.meses.length - 1)) * w;
  }

  private scaleY(v: number, max: number): number {
    const h = this.CHART_H - this.PAD_T - this.PAD_B;
    return this.PAD_T + h - (v / max) * h;
  }

  get lineMax(): number {
    return Math.max(...this.meses.map(m => Math.max(m.nuevos, m.cerrados))) + 4;
  }

  polyline(key: 'nuevos' | 'cerrados'): string {
    return this.meses
      .map((m, i) => `${this.scaleX(i)},${this.scaleY(m[key], this.lineMax)}`)
      .join(' ');
  }

  yGridLines(): number[] {
    const step = Math.ceil(this.lineMax / 4);
    const lines: number[] = [];
    for (let v = 0; v <= this.lineMax; v += step) lines.push(v);
    return lines;
  }

  ngOnInit(): void {}
}