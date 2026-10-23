// 🔴 MOCK — Este archivo reemplaza temporalmente a HU07 (flujo por tipo de expediente) y
// HU08 (catálogo de checklist por estado). Cuando el back esté listo, este archivo se borra
// y estados.service.ts pasa a consumir /api/tipoexpediente/:id/estados directamente.

import { EstadoDefinicion, TareaChecklist } from './estado.model';

/**
 * Flujos disponibles. La clave hoy es un string normalizado porque el catálogo real
 * de tipoexpediente todavía no separa "Demanda Civil" por rol (ver HU19).
 * Cuando HU19 esté cargado, esta clave pasa a ser el id numérico de tipoexpediente.
 */
export const FLUJOS_POR_TIPO: Record<string, EstadoDefinicion[]> = {

  // Piloto elegido para HU09 — flujo largo, lineal con 2 bifurcaciones (favorable/desfavorable)
  DEMANDA_CIVIL_ACTORA: [
    { nombre: 'INICIO',                            siguientes: ['TRABA DE LITIS'] },
    { nombre: 'TRABA DE LITIS',                    siguientes: ['PRUEBA'] },
    { nombre: 'PRUEBA',                            siguientes: ['ALEGATO'] },
    { nombre: 'ALEGATO',                           siguientes: ['SENTENCIA 1° INSTANCIA FAVORABLE', 'SENTENCIA 1° INSTANCIA DESFAVORABLE'] },
    { nombre: 'SENTENCIA 1° INSTANCIA FAVORABLE',  siguientes: ['APELACIÓN'] },
    { nombre: 'SENTENCIA 1° INSTANCIA DESFAVORABLE', siguientes: ['APELACIÓN'] },
    { nombre: 'APELACIÓN',                         siguientes: ['SENTENCIA 2° INSTANCIA FAVORABLE', 'SENTENCIA 2° INSTANCIA DESFAVORABLE'] },
    { nombre: 'SENTENCIA 2° INSTANCIA FAVORABLE',  siguientes: ['EJECUCIÓN DE SENTENCIA'] },
    { nombre: 'SENTENCIA 2° INSTANCIA DESFAVORABLE', siguientes: ['RECURSO EXTRAORDINARIO FEDERAL', 'EJECUCIÓN DE SENTENCIA'] },
    { nombre: 'RECURSO EXTRAORDINARIO FEDERAL',    siguientes: ['EJECUCIÓN DE SENTENCIA'] },
    { nombre: 'EJECUCIÓN DE SENTENCIA',            siguientes: ['FINALIZADO'] },
    { nombre: 'FINALIZADO',                        siguientes: [] },
  ],

  // Segundo flujo de prueba — corto, ideal para testear la bifurcación terminal
  DESAFUEROS: [
    { nombre: 'EN ANÁLISIS',                     siguientes: ['DEVUELTO AL SECTOR REQUIRENTE', 'JUICIO INICIADO'] },
    { nombre: 'DEVUELTO AL SECTOR REQUIRENTE',   siguientes: [] },
    { nombre: 'JUICIO INICIADO',                 siguientes: [] },
  ],
};

// 🔴 MOCK — Checklist inicial de cada estado. Recortado a los ítems más representativos
// de la planilla para no hardcodear cientos de líneas; la carga completa la hace HU09
// contra la base real.
const CHECKLIST_POR_ESTADO: Record<string, string[]> = {
  'INICIO': [
    'Reunir documental respaldatoria',
    'Determinar monto reclamado',
    'Definir competencia',
    'Redacción de demanda',
    'Presentación en sistema judicial - sorteo de causa',
  ],
  'TRABA DE LITIS': [
    'Control de proveído que ordena traslado',
    'Confección de cédulas',
    'Control de vencimiento del plazo para contestar',
    'Control de excepciones opuestas',
  ],
  'PRUEBA': [
    'Redacción de oficios',
    'Control de designación de perito',
    'Control de presentación de pericia',
    'Notificar testigos',
  ],
  'ALEGATO': [
    'Control de prueba pendiente',
    'Redacción de alegato',
    'Presentación en sistema judicial',
  ],
  'SENTENCIA 1° INSTANCIA FAVORABLE': [
    'Control de dictado de sentencia',
    'Evaluación de montos',
    'Contestación de la expresión de agravios',
  ],
  'SENTENCIA 1° INSTANCIA DESFAVORABLE': [
    'Control de dictado de sentencia',
    'Evaluación de responsabilidad',
    'Apelación de sentencia',
  ],
  'APELACIÓN': [
    'Notificación de la Cámara para expresar agravios',
    'Redacción de recurso',
    'Contestación de agravios (si corresponde)',
  ],
  'SENTENCIA 2° INSTANCIA FAVORABLE': [
    'Control de dictado de sentencia',
    'Control de honorarios',
  ],
  'SENTENCIA 2° INSTANCIA DESFAVORABLE': [
    'Control de dictado de sentencia',
    'Definir estrategia: recurso extraordinario o previsión',
  ],
  'RECURSO EXTRAORDINARIO FEDERAL': [
    'Análisis de procedencia',
    'Redacción del recurso extraordinario',
    'Seguimiento de concesión o denegación',
  ],
  'EJECUCIÓN DE SENTENCIA': [
    'Liquidación',
    'Intimación de pago',
    'Registro de cobro efectivo',
  ],
  'FINALIZADO': [
    'Verificar cumplimiento total',
    'Registrar resultado final',
    'Archivo interno',
  ],
  'EN ANÁLISIS': [
    'Pedido de antecedentes internos',
    'Control de documentación respaldatoria',
    'Definir estrategia: devuelto al sector / juicio iniciado',
  ],
  'DEVUELTO AL SECTOR REQUIRENTE': [
    'Registrar motivo de devolución',
    'Registrar documentación o información requerida',
  ],
  'JUICIO INICIADO': [
    'Registrar tipo de acción judicial',
    'Cambio de estado a: Demanda Laboral – Parte Actora', // 🔴 nota: dispara la HU19 (alta manual del nuevo tipo)
  ],
};

/** Crea el checklist inicial (todas las tareas en EN_CURSO) al entrar por primera vez a un estado. */
export function crearTareasIniciales(nombreEstado: string): TareaChecklist[] {
  const descripciones = CHECKLIST_POR_ESTADO[nombreEstado] ?? [];

  return descripciones.map(descripcion => ({
    id: crypto.randomUUID(),
    descripcion,
    estado: 'EN_CURSO',
    observacion: '',
    fechaRegistro: new Date().toISOString(),
    fechaVencimiento: undefined,
    enviarAgenda: false,
    archivos: [],
  }));
}

/**
 * Resuelve qué flujo usar según el nombre del tipo de expediente.
 * 🔴 MOCK: hoy solo reconoce 2 flujos a modo de prueba; el resto cae en DEMANDA_CIVIL_ACTORA
 * por defecto para poder seguir probando la pantalla con cualquier expediente existente.
 */
export function resolverClaveFlujo(tipoNombre: string): string {
  const normalizado = tipoNombre.toUpperCase();

  if (normalizado.includes('DESAFUERO')) return 'DESAFUEROS';
  return 'DEMANDA_CIVIL_ACTORA';
}