import { Injectable } from '@angular/core';
import { LogEntry, LogFiltros, LogStats } from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class Log {

  private mockData: LogEntry[] = [
    { id: 1, fechaHora: new Date('2026-02-15T11:20'), usuario: 'Juan Pérez',    accion: 'Alta',      modulo: 'Expedientes', descripcion: 'Creó el expediente N 1240 para el cliente García',      resultado: 'OK'    },
    { id: 2, fechaHora: new Date('2026-02-15T12:30'), usuario: 'Ana Gómez',     accion: 'Edición',   modulo: 'Clientes',    descripcion: 'Editó los datos de contacto del cliente López',         resultado: 'OK'    },
    { id: 3, fechaHora: new Date('2026-02-14T09:23'), usuario: 'Laura Fernández',accion: 'Alta',     modulo: 'Clientes',    descripcion: 'Dio de alta al cliente Pablo Rodríguez',                resultado: 'Error' },
    { id: 4, fechaHora: new Date('2026-02-14T13:10'), usuario: 'Sistema',       accion: 'Descarga',  modulo: 'Documentos',  descripcion: 'Error al intentar cargar documento adjunto',            resultado: 'OK'    },
    { id: 5, fechaHora: new Date('2026-02-13T10:00'), usuario: 'Juan Pérez',    accion: 'Login',     modulo: 'Sistema',     descripcion: 'Inicio de sesión exitoso desde IP 192.168.1.1',         resultado: 'OK'    },
    { id: 6, fechaHora: new Date('2026-02-13T10:45'), usuario: 'Ana Gómez',     accion: 'Eliminación',modulo:'Expedientes', descripcion: 'Eliminó el expediente N 1198',                          resultado: 'Error' },
    { id: 7, fechaHora: new Date('2026-02-13T15:30'), usuario: 'Laura Fernández',accion: 'Edición',  modulo: 'Agenda',      descripcion: 'Modificó el turno del 14/02 a las 10:00',               resultado: 'OK'    },
    { id: 8, fechaHora: new Date('2026-02-12T08:15'), usuario: 'Juan Pérez',    accion: 'Descarga',  modulo: 'Reportes',    descripcion: 'Descargó reporte mensual de expedientes',               resultado: 'OK'    },
    { id: 9, fechaHora: new Date('2026-02-12T09:00'), usuario: 'Ana Gómez',     accion: 'Alta',      modulo: 'Documentos',  descripcion: 'Subió contrato firmado para expediente N 1205',         resultado: 'OK'    },
    { id: 10,fechaHora: new Date('2026-02-11T16:20'), usuario: 'Laura Fernández',accion: 'Login',    modulo: 'Sistema',     descripcion: 'Inicio de sesión desde dispositivo móvil',              resultado: 'Error' },
  ];

  getStats(): LogStats {
    return {
      totalEventos: this.mockData.length,
      exitosos:       this.mockData.filter(l => l.resultado === 'OK').length,
      errores:        this.mockData.filter(l => l.resultado === 'Error').length,
      usuariosActivos: [...new Set(this.mockData.map(l => l.usuario))].length,
    };
  }

  getLogs(filtros: LogFiltros, pagina: number, porPagina = 5): { data: LogEntry[]; total: number } {
    let result = [...this.mockData];

    if (filtros.usuario)    result = result.filter(l => l.usuario === filtros.usuario);
    if (filtros.modulo)     result = result.filter(l => l.modulo === filtros.modulo);
    if (filtros.tipoAccion) result = result.filter(l => l.accion === filtros.tipoAccion);
    if (filtros.resultado)  result = result.filter(l => l.resultado === filtros.resultado);
    if (filtros.fechaDesde) result = result.filter(l => new Date(l.fechaHora) >= new Date(filtros.fechaDesde!));
    if (filtros.fechaHasta) result = result.filter(l => new Date(l.fechaHora) <= new Date(filtros.fechaHasta!));

    const total = result.length;
    const data  = result.slice((pagina - 1) * porPagina, pagina * porPagina);
    return { data, total };
  }

  getAllLogs(filtros: LogFiltros): LogEntry[] {
    let result = [...this.mockData];

    if (filtros.usuario)    result = result.filter(l => l.usuario === filtros.usuario);
    if (filtros.modulo)     result = result.filter(l => l.modulo === filtros.modulo);
    if (filtros.tipoAccion) result = result.filter(l => l.accion === filtros.tipoAccion);
    if (filtros.resultado)  result = result.filter(l => l.resultado === filtros.resultado);
    if (filtros.fechaDesde) result = result.filter(l => new Date(l.fechaHora) >= new Date(filtros.fechaDesde!));
    if (filtros.fechaHasta) result = result.filter(l => new Date(l.fechaHora) <= new Date(filtros.fechaHasta!));

    return result;
  }

  getUsuarios(): string[] {
    return [...new Set(this.mockData.map(l => l.usuario))];
  }
}