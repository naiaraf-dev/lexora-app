import { BadgeConfig } from '../../../shared/components/ui-badge/ui-badge';
import { UiSelectOption } from '../../../shared/components/ui-select/ui-select';
import { EstadoLiquidacion, EstadoPrevision, ModoPrevision, Obligado, PrevisionResumen } from './prevision.model';

/** Badge por estado de la previsión. Lo usan el listado, el detalle y la pestaña del expediente. */
export const BADGE_ESTADO: Record<EstadoPrevision, BadgeConfig> = {
  'Registrado':          { label: 'Registrado',          classes: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',               dot: 'bg-gray-400'   },
  'En análisis':         { label: 'En análisis',         classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',              dot: 'bg-blue-500'   },
  'Con previsión':       { label: 'Con previsión',       classes: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',      dot: 'bg-indigo-500' },
  'Listo para impulsar': { label: 'Listo para impulsar', classes: 'bg-warning/10 text-warning',                                                    dot: 'bg-warning'    },
  'Impulsado':           { label: 'Impulsado',           classes: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',      dot: 'bg-purple-500' },
  'Pagado':              { label: 'Pagado',              classes: 'bg-success/10 text-success',                                                    dot: 'bg-success'    },
  'Acreditado':          { label: 'Acreditado',          classes: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',              dot: 'bg-teal-500'   },
  'Cerrado':             { label: 'Cerrado',             classes: 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400',               dot: 'bg-gray-300'   },
};

export const BADGE_MODO: Record<ModoPrevision, BadgeConfig> = {
  ACTIVO:      { label: 'Activo',      classes: 'bg-primary/10 text-primary',                                      dot: 'bg-primary'  },
  SEGUIMIENTO: { label: 'Seguimiento', classes: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300', dot: 'bg-gray-400' },
};

export const BADGE_LIQUIDACION: Record<EstadoLiquidacion, BadgeConfig> = {
  'Practicada':       { label: 'Practicada',       classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  'Impugnada':        { label: 'Impugnada',        classes: 'bg-danger/10 text-danger',                                       dot: 'bg-danger'   },
  'Con traslado':     { label: 'Con traslado',     classes: 'bg-warning/10 text-warning',                                     dot: 'bg-warning'  },
  'Aprobada / firme': { label: 'Aprobada / firme', classes: 'bg-success/10 text-success',                                     dot: 'bg-success'  },
};

/** Color de cada marca (los nombres los manda el back en `marcas`). */
export const MARCA_CLASES: Record<string, string> = {
  'Documentación completa':          'bg-success/10 text-success',
  'Con prorrateo art. 730 aplicado': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  'Pago de tercero informado':       'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  'Pago parcial':                    'bg-warning/10 text-warning',
  'Factura cargada':                 'bg-success/10 text-success',
  'Liquidación no firme':            'bg-warning/10 text-warning',
  'Notificación pendiente':          'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  'Saldo a cargo del cliente':       'bg-danger/10 text-danger',
  'Intimación vigente':              'bg-warning/10 text-warning',
  'Intimación vencida':              'bg-danger/10 text-danger',
};
export const MARCA_CLASE_DEFAULT = 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300';

export const OBLIGADO_LABEL: Record<Obligado, string> = {
  CLIENTE: 'Cliente',
  CONTRAPARTE: 'Contraparte',
  TERCERO: 'Tercero',
};

export const OBLIGADO_OPTIONS: UiSelectOption[] = [
  { value: 'CLIENTE',     label: 'Cliente'     },
  { value: 'CONTRAPARTE', label: 'Contraparte' },
  { value: 'TERCERO',     label: 'Tercero'     },
];

export const MODO_OPTIONS: UiSelectOption[] = [
  { value: 'ACTIVO',      label: 'Activo'      },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
];

/** Regla de la sección 1: el modo por defecto sale del obligado. */
export function modoPorObligado(obligado: Obligado): ModoPrevision {
  return obligado === 'CLIENTE' ? 'ACTIVO' : 'SEGUIMIENTO';
}

/**
 * Qué botón se muestra en cada estado. El back vuelve a validar (409 si no corresponde);
 * esto solo evita mostrar botones que no sirven.
 */
export const ACCIONES = {
  registrarPrevision: (p: PrevisionResumen) => p.estado === 'Registrado' || p.estado === 'En análisis',
  nuevaLiquidacion:   (p: PrevisionResumen) => p.estado !== 'Cerrado',
  registrarImpulso:   (p: PrevisionResumen) => p.estado === 'Listo para impulsar',
  registrarPago:      (p: PrevisionResumen) =>
    p.estado === 'Impulsado' || (p.modo === 'SEGUIMIENTO' && p.estado === 'Con previsión'),
  acreditar:          (p: PrevisionResumen) => p.estado === 'Pagado',
  cerrar:             (p: PrevisionResumen) => p.estado === 'Acreditado',
  // No cambia el estado: se puede registrar mientras quede algo por pagar
  registrarIntimacion:(p: PrevisionResumen) => !['Pagado', 'Acreditado', 'Cerrado'].includes(p.estado),
  // Pagos y liquidaciones cargados por error se anulan (no se editan); no una vez acreditada o cerrada
  anularMovimiento:   (p: PrevisionResumen) => !['Acreditado', 'Cerrado'].includes(p.estado),
};

const FORMATO_MONTO = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** 5600000 → "$ 5.600.000,00". Montos en pesos (decisión de la sección 10), con centavos. */
export function formatMonto(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : FORMATO_MONTO.format(valor);
}

/**
 * Fecha de hoy en YYYY-MM-DD, en la hora local. toISOString() da la fecha en UTC:
 * en Argentina, después de las 21 h ya devuelve el día siguiente.
 */
export function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** 0.25 → "0,25" (coeficiente del prorrateo). */
export function formatCoeficiente(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : String(valor).replace('.', ',');
}

/** "2026-08-16" → "16/08/2026". Sin pasar por Date para no correrse un día por la zona horaria. */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}