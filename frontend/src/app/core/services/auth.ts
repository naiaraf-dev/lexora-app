import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Storage } from './storage';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private http    = inject(HttpClient);
  private storage = inject(Storage);
  private router  = inject(Router);

  private _currentUser = signal<CurrentUser | null>(null);

  currentUser     = this._currentUser.asReadonly();
  isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    const user = this.storage.getUser();
    if (user) this._currentUser.set(user as CurrentUser);
  }

  /** POST /api/auth/login — devuelve JWT, lo decodifica y guarda sesión */
  login(email: string, password: string) {
    return this.http
      .post<{ message: string; token: string }>(
        `${environment.apiUrl}/auth/login`,
        { email, password }
      )
      .pipe(
        tap(res => {
          this.storage.setToken(res.token);
          const user = this.decodeToken(res.token);
          if (user) {
            this._currentUser.set(user);
            this.storage.setUser(user);
          }
        })
      );
  }

  /** POST /api/auth/register — { nombre, apellido, email, password, confirmPassword, matricula } */
  register(nombre: string, apellido: string, email: string, password: string, confirmPassword: string, matricula?: string) {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/register`,
      { nombre, apellido, email, password, confirmPassword, matricula }
    );
  }

  /** POST /api/auth/forgot-password — { email } */
  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email }
    );
  }

  /** POST /api/auth/logout */
  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe();
    this.storage.clear();
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private decodeToken(token: string): CurrentUser | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64)) as CurrentUser;
    } catch {
      return null;
    }
  }
}
