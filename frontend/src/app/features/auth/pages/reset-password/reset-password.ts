import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthLayout } from '../../components/auth-layout/auth-layout';
import { AuthCard } from '../../components/auth-card/auth-card';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { environment } from '../../../../../environments/environment';
import { toast } from 'ngx-sonner';

/**
 * Página de restablecimiento de contraseña.
 * Lee el token desde el query param del link enviado por email.
 * Valida la nueva contraseña y la envía al backend junto con el token.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayout, AuthCard, UiInput, PrimaryBtn],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  password        = '';
  confirmPassword = '';
  loading         = signal(false);
  error           = signal('');

  /** Token de reset extraído del query param del link recibido por email. */
  private token = this.route.snapshot.queryParamMap.get('token') ?? '';

  /** Valida la nueva contraseña y llama al endpoint de reset con el token de la URL. */
  submit() {
    if (!this.password || this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token: this.token,
      password: this.password,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        toast.success('Contraseña actualizada correctamente');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('El link es inválido o expiró. Solicitá uno nuevo.');
      },
    });
  }
}