import { z } from 'zod';

export const perfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(50, 'El nombre no puede superar los 50 caracteres.'),
  apellido: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio.')
    .max(50, 'El apellido no puede superar los 50 caracteres.'),
  matricula: z
    .string()
    .trim()
    .min(1, 'La matrícula es obligatoria.')
    .max(60, 'La matrícula no puede superar los 60 caracteres.'),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio.')
    .pipe(z.email('El email no es válido.')),
  avatarUrl: z.string().default(''),
});

export type PerfilFormValues = z.infer<typeof perfilSchema>;
export type PerfilErrores = Partial<Record<keyof PerfilFormValues, string>>;