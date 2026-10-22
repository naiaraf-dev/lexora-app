/**
 * Modelos del contrato de la API de Litis (HU31).
 * Documentación completa en backend/docs/litis-contrato.md.
 */

export type AutorMensaje = 'usuario' | 'litis';

export type TipoResultado = 'documento' | 'expediente' | 'tarea' | 'novedad' | 'cliente';

export interface ResultadoLitis {
  tipo: TipoResultado;
  id: number;
  titulo: string;              // ej: "demanda_perez.pdf" o "Pérez c/ ACME S.A. s/ despido"
  subtitulo?: string;          // ej: "EXP-2025-128 · Demanda · 14/03/2025"
  expedienteId?: number;       // para el botón "Ir al expediente"
  numeroExpediente?: string;   // ej: "EXP-2025-128"
  extension?: string;          // solo documentos: "pdf" | "docx" | "jpg" ...
}

// ── Pedido: POST /api/asistente/mensajes ─────────────────────────────────────

export interface MensajeHistorial {
  autor: AutorMensaje;
  texto: string;
}

export interface PedidoLitis {
  mensaje: string;                // 1..2000 caracteres
  contexto?: string;              // número interno del expediente, ej: "EXP-2026-26"
  historial?: MensajeHistorial[]; // últimos mensajes (máx. 10), sin incluir el actual
}

// ── Respuesta ────────────────────────────────────────────────────────────────

export interface RespuestaLitis {
  respuesta: string;              // texto que escribe Litis
  resultados: ResultadoLitis[];   // tarjetas a mostrar; siempre viene, aunque esté vacío
}

// ── Enlace de descarga: POST /api/asistente/documentos/:id/enlace ────────────

export type ModoDescarga = 'ver' | 'descargar';

export interface PedidoEnlace {
  modo?: ModoDescarga;            // por defecto 'descargar'
}

export interface EnlaceDescarga {
  url: string;                    // ej: "/api/asistente/documentos/descargar?t=...&modo=ver"
  expiraEn: number;               // segundos de validez (60)
}

// ── Errores ──────────────────────────────────────────────────────────────────

export type CodigoErrorLitis =
  | 'PEDIDO_INVALIDO'             // 400
  | 'NO_AUTENTICADO'              // 401
  | 'ENLACE_INVALIDO'             // 401: token del enlace vencido o adulterado
  | 'SIN_ACCESO'                  // 403: el expediente de contexto no está asignado al usuario
  | 'NO_ENCONTRADO'               // 404: expediente de contexto o documento inexistente
  | 'LIMITE_CONSULTAS'            // 429
  | 'ASISTENTE_NO_DISPONIBLE'     // 503: sin API key o proveedor caído
  | 'ERROR_INTERNO';              // 500

export interface ErrorLitis {
  codigo: CodigoErrorLitis;
  mensaje: string;                // texto apto para mostrar al usuario
}
