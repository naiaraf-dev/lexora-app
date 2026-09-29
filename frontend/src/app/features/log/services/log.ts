import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LogEntry, LogFiltros, LogStats, LogUsuario } from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class Log {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/logs`;

  /** GET /api/logs/stats */
  // trae los totales del log para el rango de fechas elegido
  getStats(filtros: LogFiltros = { fechaDesde: '', fechaHasta: '' }): Observable<LogStats> {
    const params = this.armarParams({ fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta });
    return this.http.get<LogStats>(`${this.url}/stats`, { params });
  }

  /** GET /api/logs */
  // trae una pagina de logs aplicando los filtros en el backend
  getLogs(filtros: LogFiltros, pagina: number, porPagina = 5): Observable<{ data: LogEntry[]; total: number }> {
    const params = this.armarParams({
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      usuario: filtros.usuario,
      modulo: filtros.modulo,
      accion: filtros.tipoAccion,
      resultado: filtros.resultado,
      pagina,
      pageSize: porPagina,
    });
    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({ data: res.data.map((l: any) => this.mapFromBackend(l)), total: res.total })),
    );
  }

  // trae todos los logs que cumplen los filtros (para exportar)
  getAllLogs(filtros: LogFiltros, total: number): Observable<LogEntry[]> {
    return this.getLogs(filtros, 1, Math.max(total, 1)).pipe(map(res => res.data));
  }

  /** GET /api/logs/usuarios */
  // trae los usuarios que tienen eventos registrados (para el filtro)
  getUsuarios(): Observable<LogUsuario[]> {
    return this.http.get<LogUsuario[]>(`${this.url}/usuarios`);
  }

  // arma los query params descartando los filtros vacios
  private armarParams(valores: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor !== undefined && valor !== null && valor !== '') params = params.set(clave, String(valor));
    }
    return params;
  }

  // convierte la respuesta del backend al modelo del front
  private mapFromBackend(l: any): LogEntry {
    return {
      id: l.id,
      fechaHora: new Date(l.fechaHora),
      usuario: l.usuario ?? 'Sistema',
      accion: l.accion,
      modulo: l.modulo,
      descripcion: l.descripcion ?? '',
      resultado: l.resultado,
      ip: l.ip ?? null,
    };
  }
}
