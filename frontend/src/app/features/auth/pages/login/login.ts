import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthLayout } from '../../components/auth-layout/auth-layout';
import { AuthCard } from '../../components/auth-card/auth-card';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { z } from 'zod';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { loginSchema, LoginErrors } from '../../models/auth.schema';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayout, AuthCard, UiInput, PrimaryBtn],
  templateUrl: './login.html',
})
export class Login {
  username = '';
  password = '';
  loading = signal(false);
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
    // TODO: conectar con AuthService
    setTimeout(() => this.loading.set(false), 1500);
  }
}