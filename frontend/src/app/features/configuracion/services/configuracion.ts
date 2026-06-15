import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Configuracion {
  private http   = inject(HttpClient);
  private auth   = inject(Auth);
  private router = inject(Router);

  getUsuarioActual() {
    return this.auth.currentUser();
  }

  getPerfil(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/usuarios/profile`);
  }

  guardarPerfil(datos: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/usuarios/profile`, datos);
  }

  cambiarPassword(actual: string, nueva: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/usuarios/change-password`, {
      actual,
      nueva,
    });
  }

  eliminarCuenta(): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/usuarios/profile`);
  }
}