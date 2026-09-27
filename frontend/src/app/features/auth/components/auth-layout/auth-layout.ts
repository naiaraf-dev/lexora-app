import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  templateUrl: './auth-layout.html',
})
export class AuthLayout implements OnInit {
  ngOnInit(): void {
    // Las pantallas de autenticación siempre se ven en modo claro,
    // sin importar la preferencia de dark mode guardada para dentro del sistema.
    document.documentElement.classList.remove('dark');
  }
}