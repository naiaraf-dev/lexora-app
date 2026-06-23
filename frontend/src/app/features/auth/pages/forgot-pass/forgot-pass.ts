import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { z } from 'zod';
import { AuthLayout } from '../../components/auth-layout/auth-layout';
import { AuthCard } from '../../components/auth-card/auth-card';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { forgotSchema, ForgotErrors } from '../../models/auth.schema';
import { Auth } from '../../../../core/services/auth';

/**
 * Página de recuperación de contraseña.
 * Envía el email al backend para generar el link de reset.
 * Siempre muestra el mensaje de éxito por seguridad, sin revelar si el email existe.
 */
@Component({
  selector: 'app-forgot-pass',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayout, AuthCard, UiInput, PrimaryBtn],
  templateUrl: './forgot-pass.html',
})
export class ForgotPass {
  private authService = inject(Auth);

  email   = '';
  loading = signal(false);
  sent    = signal(false);
  errors  = signal<ForgotErrors>({});

  /** Valida el email con Zod y llama al endpoint de forgot password. Siempre muestra éxito al usuario. */
  onSubmit() {
    const parsed = forgotSchema.safeParse({ email: this.email });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      this.errors.set({ email: flat['email']?.[0] });
      return;
    }
    this.errors.set({});
    this.loading.set(true);

    this.authService.forgotPassword(this.email).subscribe({
      // Siempre mostrar mensaje de éxito por seguridad (no revelar si el email existe)
      next:  () => { this.loading.set(false); this.sent.set(true); },
      error: () => { this.loading.set(false); this.sent.set(true); },
    });
  }
}
