export type GrupoTasa = 'SIMPLE' | 'PARAMETRICA' | 'CALCULADORA';

export interface TasaConfig {
  nombre: string;        // debe matchear TASAS[].nombre en el back
  grupo: GrupoTasa;
  fuero?: string;
}

export const TASAS_CONFIG: TasaConfig[] = [

  // ── GRUPO A — Simple (consulta de último valor vigente) ──────────────────
  { nombre: 'Tasa Activa Cartera general (préstamos) nominal anual vencida a 30 días del Banco Nación', grupo: 'SIMPLE', fuero: 'Civil / Comercial' },
  { nombre: 'Tasa Activa. Banco Nación. Efectiva mensual vencida', grupo: 'SIMPLE', fuero: 'Civil / Comercial' },
  { nombre: 'Tasa Pasiva Banco Nación', grupo: 'SIMPLE', fuero: 'Civil / Comercial' },
  { nombre: 'Tasa activa Banco Nación para préstamos personales libre destino 49 a 60 meses (hasta 22/3/16)', grupo: 'SIMPLE', fuero: 'Civil (causas antiguas)' },
  { nombre: 'Tasa Activa Banco Provincia Restantes Operaciones', grupo: 'SIMPLE', fuero: 'Provincial Bs. As.' },
  { nombre: 'Tasa Pasiva Banco Provincia', grupo: 'SIMPLE', fuero: 'Provincial Bs. As.' },
  { nombre: 'Tasa Activa Banco Provincia en Dólares', grupo: 'SIMPLE', fuero: 'Provincial Bs. As. (USD)' },
  { nombre: 'Tasa Pasiva Banco Provincia en Dólares', grupo: 'SIMPLE', fuero: 'Provincial Bs. As. (USD)' },
  { nombre: 'Tasa Pasiva BCRA', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios Internos al por Mayor - IPIM (hasta el 31/10/15)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios Internos al por Mayor - IPIM (desde el 01/01/16)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios al Consumidor INDEC- IPC/IPCNU (hasta el 31/10/15)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios al Consumidor INDEC- IPC (desde el 01/04/16)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios al Consumidor CABA - IPCBA (hasta el 28/02/22)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Índice de Precios al Consumidor CABA - IPCBA (desde el 01/03/22)', grupo: 'SIMPLE', fuero: 'Varios' },
  { nombre: 'Coeficiente de Estabilización de Referencia (CER)', grupo: 'SIMPLE', fuero: 'Laboral / varios' },

  // ── GRUPO B — Paramétrica (valor vigente + interés simple aproximado sobre período) ──
  { nombre: 'Tasa activa efectiva anual vencida, cartera general diversa del Banco Nación - Acta CNAT 2.658', grupo: 'PARAMETRICA', fuero: 'Trabajo' },
  { nombre: 'Acta CNAT 2.764/22, a partir del 07/11/03 (incluye actas anteriores)', grupo: 'PARAMETRICA', fuero: 'Trabajo' },
  { nombre: 'Actualización por CER más interés simple. Acta 2783/24 y otros', grupo: 'PARAMETRICA', fuero: 'Trabajo' },
  { nombre: 'Intereses para juicios laborales pendientes - Ley 27.802, ART 55', grupo: 'PARAMETRICA', fuero: 'Trabajo' },
  { nombre: 'Fallo Massa', grupo: 'PARAMETRICA', fuero: 'Casos específicos' },
  { nombre: 'Tasa art. 37, Ley 11.683', grupo: 'PARAMETRICA', fuero: 'Tributario' },
  { nombre: 'Tasa art. 52, Ley 11.683', grupo: 'PARAMETRICA', fuero: 'Tributario' },

  // ── GRUPO C — Calculadora propia (formulario independiente, sin scraping) ──
  { nombre: 'Indemnización por daños. Fórmula VUOTTO MÉNDEZ', grupo: 'CALCULADORA', fuero: 'Civil / Laboral' },
  { nombre: 'Indemnización por despido', grupo: 'CALCULADORA', fuero: 'Trabajo' },
  { nombre: 'Liquidación IBM - Ley 27.348', grupo: 'CALCULADORA', fuero: 'Trabajo' },
  { nombre: 'Cálculo de honorarios de letrados y peritos (Ley 27.423 – Valores UMA)', grupo: 'CALCULADORA', fuero: 'Varios' },
];

export function getTasaConfig(nombre: string): TasaConfig | undefined {
  return TASAS_CONFIG.find(t => t.nombre === nombre);
}

export function getTasaOptions(): { value: string; label: string }[] {
  return TASAS_CONFIG.map(t => ({ value: t.nombre, label: t.nombre }));
}

export function getTasaOptionsPorGrupo(grupo: GrupoTasa): { value: string; label: string }[] {
  return TASAS_CONFIG.filter(t => t.grupo === grupo).map(t => ({ value: t.nombre, label: t.nombre }));
}