import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { z } from 'zod';
import { AuthLayout } from '../../components/auth-layout/auth-layout';
import { AuthCard } from '../../components/auth-card/auth-card';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { registerSchema, RegisterErrors } from '../../models/auth.schema';
import { Auth } from '../../../../core/services/auth';

/**
 * Página de registro de nuevos usuarios.
 * Valida el formulario con Zod antes de enviar al backend.
 * Redirige a gestión de expedientes tras el registro exitoso.
 */
@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayout, AuthCard, UiInput, PrimaryBtn],
  templateUrl: './create-account.html',
})
export class CreateAccount {
  private authService = inject(Auth);
  private router      = inject(Router);

  nombre          = '';
  apellido        = '';
  matricula       = '';
  email           = '';
  password        = '';
  confirmPassword = '';
  loading         = signal(false);
  errors          = signal<RegisterErrors>({});

  /** Valida el formulario, llama al service de registro y redirige o muestra errores. */
  onSubmit() {
    const parsed = registerSchema.safeParse({
      nombre: this.nombre, apellido: this.apellido, matricula: this.matricula,
      email: this.email, password: this.password, confirmPassword: this.confirmPassword,
    });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      this.errors.set({
        nombre:          flat['nombre']?.[0],
        apellido:        flat['apellido']?.[0],
        matricula:       flat['matricula']?.[0],
        email:           flat['email']?.[0],
        password:        flat['password']?.[0],
        confirmPassword: flat['confirmPassword']?.[0],
      });
      return;
    }
    this.errors.set({});
    this.loading.set(true);

    this.authService.register(this.nombre, this.apellido, this.email, this.password, this.confirmPassword, this.matricula).subscribe({
      next: () => this.router.navigate(['/gestion-expedientes']),
      error: (err) => {
        this.loading.set(false);
        this.errors.set({ email: err.error?.message || 'Error al registrar el usuario.' });
      },
    });
  }
}
