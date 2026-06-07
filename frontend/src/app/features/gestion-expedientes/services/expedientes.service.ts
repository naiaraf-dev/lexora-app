import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/expedientes`;

  listar(filtros: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor !== '' && valor !== null && valor !== undefined)
        params = params.set(clave, String(valor));
    });
    return this.http.get<any>(this.base, { params });
  }

  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  crear(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  actualizar(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, data);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }
}