import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

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

interface IndicadoresResponse {
  stats: any[];
  estados: any[];
  areas: any[];
  tiposExpediente: any[];
  evolucion: any[];
  abogados: any[];
  vencimientos: any[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  stats: StatCard[] = [];
  estadoSlices: EstadoSlice[] = [];
  areaSlices: AreaSlice[] = [];
  tipoSlices: TipoSlice[] = [];
  meses: MesData[] = [];
  abogados: AbogadoRow[] = [];
  vencimientos: Vencimiento[] = [];

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

  ngOnInit(): void {
    this.cargarIndicadores();
  }

  private cargarIndicadores(): void {
    this.http.get<IndicadoresResponse>(`${environment.dashboardApiUrl}/indicadores`).subscribe({
      next: (data) => {
        this.stats = data.stats as StatCard[];
        this.estadoSlices = data.estados as EstadoSlice[];
        this.areaSlices = data.areas as AreaSlice[];
        this.tipoSlices = data.tiposExpediente as TipoSlice[];
        this.meses = data.evolucion as MesData[];
        this.abogados = data.abogados as AbogadoRow[];
        this.vencimientos = data.vencimientos.map((v: any) => ({
          ...v,
          tipo: v.tipoVencimiento,
        })) as Vencimiento[];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar indicadores', err);
      },
    });
  }
}