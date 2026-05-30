import { Injectable } from '@angular/core';
import { PerfilUsuario, ResultadoAccion } from '../models/configuracion.model';

@Injectable({
  providedIn: 'root',
})
export class Configuracion {
  // Mock — reemplazar con llamadas al backend / servicio de auth
  private perfil: PerfilUsuario = {
    nombre: 'Dr. John',
    apellido: 'Smith',
    matricula: 'T° 45 - F° 123 - C.A.B.A.',
    email: 'john.smith@gmail.com',
    avatarUrl: '',
  };

  // Contraseña simulada para validar el cambio
  private passwordActual = 'lexora123';

  getPerfil(): PerfilUsuario {
    return { ...this.perfil };
  }

  guardarPerfil(perfil: PerfilUsuario): ResultadoAccion {
    this.perfil = { ...perfil };
    return { ok: true, mensaje: 'Los datos del perfil se guardaron correctamente.' };
  }

  cambiarPassword(actual: string, nueva: string): ResultadoAccion {
    if (actual !== this.passwordActual) {
      return { ok: false, mensaje: 'La contraseña actual no es correcta.' };
    }
    this.passwordActual = nueva;
    return { ok: true, mensaje: 'La contraseña se actualizó correctamente.' };
  }

  eliminarCuenta(): ResultadoAccion {
    // Mock — acá iría la baja real de la cuenta
    return { ok: true, mensaje: 'La cuenta fue eliminada.' };
  }
}