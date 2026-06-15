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

  private token = this.route.snapshot.queryParamMap.get('token') ?? '';

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