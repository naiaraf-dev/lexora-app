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

  /** Retorna el usuario autenticado actual desde el signal del servicio Auth (sin llamada HTTP) */
  getUsuarioActual() {
    return this.auth.currentUser();
  }

  /** GET /api/usuarios/profile — trae nombre, apellido, matricula, email y avatarUrl del usuario logueado */
  getPerfil(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/usuarios/profile`);
  }

  /** PUT /api/usuarios/profile — actualiza nombre, apellido, matricula y email del usuario logueado */
  guardarPerfil(datos: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/usuarios/profile`, datos);
  }

  /** PUT /api/usuarios/change-password — valida la contraseña actual y la reemplaza por la nueva */
  cambiarPassword(actual: string, nueva: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/usuarios/change-password`, {
      actual,
      nueva,
    });
  }

  /** DELETE /api/usuarios/profile — baja lógica del usuario logueado (activo = 0) */
  eliminarCuenta(): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/usuarios/profile`);
  }
}