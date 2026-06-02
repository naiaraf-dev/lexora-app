export type LogResultado = 'OK' | 'Error' | 'Warning';
export type LogAccion = 'Alta' | 'Edición' | 'Eliminación' | 'Descarga' | 'Login' | 'Logout';
export type LogModulo = 'Expedientes' | 'Clientes' | 'Documentos' | 'Agenda' | 'Reportes' | 'Sistema';

export interface LogEntry {
  id: number;
  fechaHora: Date;
  usuario: string;
  accion: LogAccion;
  modulo: LogModulo;
  descripcion: string;
  resultado: LogResultado;
}

export interface LogFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
  usuario?: string;
  modulo?: string;
  tipoAccion?: string;
  resultado?: string;
}

export interface LogStats {
  totalEventos: number;
  exitosos: number;
  errores: number;
  usuariosActivos: number;
}