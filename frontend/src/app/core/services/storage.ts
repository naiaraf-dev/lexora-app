import { Injectable } from '@angular/core';

const TOKEN_KEY = 'lexora_token';
const USER_KEY  = 'lexora_user';

@Injectable({ providedIn: 'root' })
export class Storage {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getUser(): { nombre: string; apellido: string; email: string } | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  setUser(user: { nombre: string; apellido: string; email: string }): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
