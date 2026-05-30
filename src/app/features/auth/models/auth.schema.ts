import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const registerSchema = z.object({
  nombre:          z.string().trim().min(1, 'El nombre es obligatorio.').max(50),
  apellido:        z.string().trim().min(1, 'El apellido es obligatorio.').max(50),
  matricula:       z.string().trim().min(1, 'La matrícula es obligatoria.'),
  email:           z.string().trim().min(1, 'El email es obligatorio.').pipe(z.email('El email no es válido.')),
  password:        z.string().min(8, 'Mínimo 8 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirmá la contraseña.'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

export const forgotSchema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').pipe(z.email('El email no es válido.')),
});

export type LoginErrors    = Partial<Record<'username' | 'password', string>>;
export type RegisterErrors = Partial<Record<'nombre' | 'apellido' | 'matricula' | 'email' | 'password' | 'confirmPassword', string>>;
export type ForgotErrors   = Partial<Record<'email', string>>;