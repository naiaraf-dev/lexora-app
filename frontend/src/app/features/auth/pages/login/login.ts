import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { z } from 'zod';
import { AuthLayout } from '../../components/auth-layout/auth-layout';
import { AuthCard } from '../../components/auth-card/auth-card';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { loginSchema, LoginErrors } from '../../models/auth.schema';
import { Auth } from '../../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayout, AuthCard, UiInput, PrimaryBtn],
  templateUrl: './login.html',
})
export class Login {
  private authService = inject(Auth);
  private router      = inject(Router);

  username = '';
  password = '';
  loading  = signal(false);
  errors   = signal<LoginErrors>({});

  onSubmit() {
    const parsed = loginSchema.safeParse({ username: this.username, password: this.password });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      this.errors.set({ username: flat['username']?.[0], password: flat['password']?.[0] });
      return;
    }
    this.errors.set({});
    this.loading.set(true);

    // El campo "username" del form se usa como email en el backend
    this.authService.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        this.errors.set({ password: err.error?.message || 'Credenciales incorrectas.' });
      },
    });
  }
}
