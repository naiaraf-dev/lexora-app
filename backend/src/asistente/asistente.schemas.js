const { z } = require('zod');

// cantidad maxima de mensajes anteriores que se aceptan y se le mandan a la IA (controla el costo)
const MAX_MENSAJES_HISTORIAL = 10;

const mensajeHistorialSchema = z.object({
    autor: z.enum(['usuario', 'litis']),
    texto: z.string().min(1).max(4000),
});

const pedidoLitisSchema = z.object({
    mensaje: z.string().trim().min(1).max(2000),
    contexto: z.string().regex(/^EXP-\d{4}-\d+$/).optional(),
    historial: z.array(mensajeHistorialSchema).max(MAX_MENSAJES_HISTORIAL).default([]),
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

module.exports = { pedidoLitisSchema, resultadoLitisSchema, MAX_MENSAJES_HISTORIAL };
