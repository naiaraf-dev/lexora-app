export interface PerfilUsuario {
  nombre: string;
  apellido: string;
  matricula: string;
  email: string;
  avatarUrl: string;
}

export interface CambioPassword {
  actual: string;
  nueva: string;
  confirmar: string;
}

export interface ResultadoAccion {
  ok: boolean;
  mensaje?: string;
}