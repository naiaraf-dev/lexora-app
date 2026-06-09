import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { z } from 'zod';
import { ActivatedRoute } from '@angular/router';

import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { Configuracion } from '../../services/configuracion';
import { PerfilUsuario } from '../../models/configuracion.model';
import { perfilSchema, PerfilErrores } from '../../models/configuracion.schema';

import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';
import { toast } from 'ngx-sonner';

type Tab = 'perfil' | 'seguridad';
type ToastTipo = 'success' | 'error';

const TAMANO_MAX_MB = 5;

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiConfirmModal],
  templateUrl: './configuracion.html',
})
export class ConfiguracionView implements OnInit {
  // Tabs
  tab = signal<Tab>('perfil');

  // Perfil
  perfil: PerfilUsuario = { nombre: '', apellido: '', matricula: '', email: '', avatarUrl: '' };
  imagenError = signal('');
  perfilErrors = signal<PerfilErrores>({});

  iniciales = computed(() =>
    `${this.perfil.nombre.charAt(0)}${this.perfil.apellido.charAt(0)}`.toUpperCase()
  );

  // Toast / feedback
  toast = signal<{ tipo: ToastTipo; texto: string } | null>(null);

  // Modal cambiar contraseña
  passwordModalAbierto = signal(false);
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  passwordError = signal('');

  // Modal eliminar cuenta
  deleteModalAbierto = signal(false);

  editando = signal(false);

  constructor(private config: Configuracion, private route: ActivatedRoute) {}

  ngOnInit() {
    this.perfil = this.config.getPerfil();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'seguridad' || tab === 'perfil') {
      this.tab.set(tab);
    }
  }

  // Perfil
  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imagenError.set('');

    if (!file.type.startsWith('image/')) {
      this.imagenError.set('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > TAMANO_MAX_MB * 1024 * 1024) {
      this.imagenError.set(`La imagen supera el tamaño máximo de ${TAMANO_MAX_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => (this.perfil.avatarUrl = reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  guardarPerfil() {
    const parsed = perfilSchema.safeParse(this.perfil);

    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      const errores: PerfilErrores = {};
      (Object.keys(fieldErrors) as (keyof PerfilErrores)[]).forEach((campo) => {
        errores[campo] = fieldErrors[campo]?.[0];
      });
      this.perfilErrors.set(errores);
      this.mostrarToast('error', 'Revise los campos marcados del formulario.');
      return;
    }

    this.perfilErrors.set({});
    this.perfil = { ...this.perfil, ...parsed.data };
    const res = this.config.guardarPerfil(this.perfil);
    this.mostrarToast(res.ok ? 'success' : 'error', res.mensaje ?? '');
    this.editando.set(false);
  }

  cancelarPerfil() {
    this.perfil = this.config.getPerfil();
    this.imagenError.set('');
    this.perfilErrors.set({});
    this.editando.set(false);
  }

  // Contraseña
  abrirPasswordModal() {
    this.resetPasswordForm();
    this.passwordModalAbierto.set(true);
  }

  cerrarPasswordModal() {
    this.passwordModalAbierto.set(false);
    this.resetPasswordForm();
  }

  guardarPassword() {
    this.passwordError.set('');

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.passwordError.set('Complete todos los campos.');
      return;
    }
    if (this.passwordNueva.length < 8) {
      this.passwordError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }

    const res = this.config.cambiarPassword(this.passwordActual, this.passwordNueva);
    if (!res.ok) {
      this.passwordError.set(res.mensaje ?? 'No se pudo cambiar la contraseña.');
      return;
    }

    this.cerrarPasswordModal();
    this.mostrarToast('success', res.mensaje ?? '');
  }

  private resetPasswordForm() {
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.passwordError.set('');
  }

  // Eliminar cuenta
  abrirDeleteModal() {
    this.deleteModalAbierto.set(true);
  }

  cerrarDeleteModal() {
    this.deleteModalAbierto.set(false);
  }

  confirmarEliminar() {
    const res = this.config.eliminarCuenta();
    this.cerrarDeleteModal();
    this.mostrarToast(res.ok ? 'success' : 'error', res.mensaje ?? '');
  }

  // Toast
  private mostrarToast(tipo: ToastTipo, texto: string) {
    if (tipo === 'success') toast.success(texto);
    else toast.error(texto);
  }
}