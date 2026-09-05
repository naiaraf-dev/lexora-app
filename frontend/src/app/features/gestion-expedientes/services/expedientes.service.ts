import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Service HTTP para el módulo de expedientes. Consume el endpoint /api/expedientes. */
@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private http = inject(HttpClient);

  /** URL base del endpoint de expedientes. */
  private base = `${environment.apiUrl}/expedientes`;

  /** Lista expedientes con filtros y paginación. Omite parámetros vacíos, null o undefined. */
  listar(filtros: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== '' && valor !== null && valor !== undefined)
        params = params.set(clave, String(valor));
    });
    return this.http.get<any>(this.base, { params });
  }

  /** Obtiene el detalle de un expediente por ID. */
  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  /** Crea un nuevo expediente con el payload recibido. */
  crear(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  /** Actualiza los datos de un expediente existente por ID. */
  actualizar(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, data);
  }

  /** Elimina un expediente por ID (Baja lógica). */
  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  /** Lista todas las causas con sus expedientes anidados. */
  listarCausas(filtros: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
        if (valor !== '' && valor !== null && valor !== undefined)
            params = params.set(clave, String(valor));
    });
    return this.http.get<any>(`${environment.apiUrl}/causas`, { params });
  }
}