const { z } = require('zod');

const mensajeHistorialSchema = z.object({
    autor: z.enum(['usuario', 'litis']),
    texto: z.string().min(1).max(4000),
});

const pedidoLitisSchema = z.object({
    mensaje: z.string().trim().min(1).max(2000),
    contexto: z.string().regex(/^EXP-\d{4}-\d+$/).optional(),
    historial: z.array(mensajeHistorialSchema).max(10).default([]),
});

const resultadoLitisSchema = z.object({
    tipo: z.enum(['documento', 'expediente', 'tarea', 'novedad', 'cliente']),
    id: z.number().int(),
    titulo: z.string(),
    subtitulo: z.string().optional(),
    expedienteId: z.number().int().optional(),
    numeroExpediente: z.string().optional(),
    extension: z.string().optional(),
});

module.exports = { pedidoLitisSchema, resultadoLitisSchema };
