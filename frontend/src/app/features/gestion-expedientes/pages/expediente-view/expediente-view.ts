import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCard } from '../../../../shared/components/info-card/info-card';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

const DEBUG_TAREAS = false;

interface Campo {
  iconPath: string;
  label: string;
  value: string;
  full?: boolean;
}

interface Documento {
  id?: number | string;
  nombre: string;
  meta: string;
  storageKey?: string;
  urlDescarga?: string;
}

interface Tarea {
  id?: number | string;
  novedadId?: number | string | null;
  titulo: string;
  descripcion?: string;
  vencimiento: string;
  fechaVencimientoRaw?: string | null;
  fechaCreacion?: string;
  fechaCreacionRaw?: string | null;
  fechaCompletado?: string;
  fechaCompletadoRaw?: string | null;
  estado: 'Cumplida' | 'Pendiente';
  estadoNombre?: string;
  estadoId?: number | string | null;
  prioridad?: string;
  prioridadId?: number | string | null;
  usuarioCreacion?: string;
  usuarioCompletado?: string;
  activo?: boolean;
}

interface Novedad {
  id?: number | string;
  tipo: string;
  badgeClasses: string;
  dotClasses: string;
  fecha: string;
  autor: string;
  titulo: string;
  descripcion: string;
  adjuntos: string[];
  tarea?: Tarea;
}

interface ExpedienteApi {
  id: number;
  numeroInterno?: string;
  numeroExpedienteJudicial?: string;
  caratula?: string;
  area?: string;
  descripcion?: string;
  juzgado?: string;
  fuero?: string;
  secretaria?: string;
  jurisdiccion?: string;
  instancia?: string;
  contraparte?: string;
  abogadoContraparte?: string;
  origenCaso?: string;
  fechaInicio?: string;
  fechaUltActuacion?: string;
  fechaEstimadaCierre?: string;
  fechaProcesalProxima?: string;
  fechaVencimiento?: string;
  fechaCreacion?: string;
  fechaUltimaModificacion?: string;
  tipo?: {
    id: number;
    nombre: string;
  } | null;
  estado?: {
    id: number;
    nombre: string;
  } | null;
  cliente?: {
    id: number;
    nombre: string;
  } | null;
  usuarioPrincipal?: {
    id: number;
    nombre: string;
  } | null;
  usuarioSecundario?: {
    id: number;
    nombre: string;
  } | null;
  prioridad?: {
    id: number;
    nombre: string;
  } | null;
}

/** Íconos heroicons outline */
const ICON = {
  doc: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  building: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  scale: 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z',
  book: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  mapPin: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
  flag: 'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5',
  layers: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 12m0 0l4.179 2.25M21.75 12l-4.179 2.25m0 0L12 18l-5.571-3m11.142 0L21.75 12',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  target: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
};

/**
 * Página de vista de detalle de un expediente (modo solo lectura).
 * Carga en paralelo el expediente, documentos, novedades y tareas.
 * Arma las secciones de datos generales, judiciales, profesionales,
 * fechas clave, clasificación, timeline de novedades y panel de tareas.
 */
@Component({
  selector: 'app-expediente-view',
  standalone: true,
  imports: [CommonModule, InfoCard, PrimaryBtn],
  templateUrl: './expediente-view.html',
})
export class ExpedienteView implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  cargando = false; // Indica si hay una carga en curso para mostrar el estado de loading en la vista.
  error = '';
  expediente: ExpedienteApi | null = null;

  /** Controla la visibilidad del historial de tareas cumplidas en el panel de tareas. */
  mostrarHistorialTareas = false;

  /** Datos del panel de resumen: estado, próximo vencimiento y conteo de tareas. */
  resumen = {
    estado: '-',
    proximoVencimiento: '-',
    cumplidas: 0,
    pendientes: 0,
    vencidas: 0,
  };

  datosGenerales: Campo[] = [];
  datosJudiciales: Campo[] = [];
  profesionales: Campo[] = [];
  fechasClaves: Campo[] = [];
  clasificacion: Campo[] = [];
  documentos: Documento[] = [];
  novedades: Novedad[] = [];
  tareas: Tarea[] = [];
  tareasOrdenadas: Tarea[] = [];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!id || Number.isNaN(id)) {
      this.error = 'ID de expediente inválido.';
      return;
    }

    this.cargarExpediente(id);
  }

  /** Carga en paralelo el expediente y sus recursos relacionados usando forkJoin. */
  cargarExpediente(id: number): void {
    this.cargando = true;
    this.error = '';

    if (DEBUG_TAREAS) {
      console.clear();
      console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] Inicio carga');
      console.log('ID expediente desde route:', id);
      console.log('URL expediente:', `${environment.apiUrl}/expedientes/${id}`);
      console.log('URL documentos:', `${environment.apiUrl}/documentos?expediente=${id}&activo=1`);
      console.log('URL novedades:', `${environment.apiUrl}/expedientes/${id}/novedades`);
      console.log('URL tareas:', `${environment.apiUrl}/tarea?expediente=${id}&activo=1`);
      console.groupEnd();
    }

    forkJoin({
      expediente: this.http.get<ExpedienteApi>(`${environment.apiUrl}/expedientes/${id}`),

      documentos: this.http
        .get<any>(`${environment.apiUrl}/documentos`, {
          params: {
            expediente: String(id),
            activo: '1',
          },
        })
        .pipe(
          catchError((err) => {
            console.warn('[EXPEDIENTE VIEW DEBUG] No se pudieron cargar documentos:', err);
            return of([]);
          })
        ),

      novedades: this.http
        .get<any>(`${environment.apiUrl}/expedientes/${id}/novedades`)
        .pipe(
          catchError((err) => {
            console.warn('[EXPEDIENTE VIEW DEBUG] No se pudieron cargar novedades:', err);
            return of([]);
          })
        ),

      tareas: this.http
        .get<any>(`${environment.apiUrl}/tarea`, {
          params: {
            expediente: String(id),
            activo: '1',
          },
        })
        .pipe(
          catchError((err) => {
            console.warn('[EXPEDIENTE VIEW DEBUG] No se pudieron cargar tareas:', err);
            return of([]);
          })
        ),
    }).subscribe({
      next: ({ expediente, documentos, novedades, tareas }) => {
        this.ngZone.run(() => {
          if (DEBUG_TAREAS) {
            console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] RESPUESTAS RAW');
            console.log('EXPEDIENTE RAW:', expediente);
            console.log('DOCUMENTOS RAW:', documentos);
            console.log('NOVEDADES RAW:', novedades);
            console.log('TAREAS RAW:', tareas);
            console.log('Array extraído de tareas:', this.extraerArray(tareas));
            console.table(this.extraerArray(tareas));
            console.groupEnd();
          }

          this.expediente = expediente;
          this.documentos = this.mapearDocumentos(documentos);
          this.tareas = this.mapearTareas(tareas);
          this.tareasOrdenadas = this.ordenarTareasPorFecha(this.tareas);

          if (DEBUG_TAREAS) {
            console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] TAREAS DESPUÉS DEL MAPEO');
            console.log('Tareas mapeadas:', this.tareas);
            console.table(this.tareas);
            console.log('Tareas ordenadas:', this.tareasOrdenadas);
            console.table(this.tareasOrdenadas);
            console.log('Cumplidas detectadas:', this.tareas.filter((t) => t.estado === 'Cumplida'));
            console.log('Pendientes detectadas:', this.tareas.filter((t) => t.estado === 'Pendiente'));
            console.groupEnd();
          }

          this.novedades = this.mapearNovedades(novedades);

          this.armarVista(expediente);

          if (DEBUG_TAREAS) {
            console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] RESUMEN FINAL');
            console.log('Resumen:', this.resumen);
            console.log('Novedades mapeadas:', this.novedades);
            console.table(this.novedades.map((n) => ({
              id: n.id,
              tipo: n.tipo,
              titulo: n.titulo,
              tareaTitulo: n.tarea?.titulo,
              tareaEstado: n.tarea?.estado,
              tareaVencimiento: n.tarea?.vencimiento,
            })));
            console.groupEnd();
          }

          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('[EXPEDIENTE VIEW DEBUG] Error al cargar expediente:', err);

          this.error = err?.error?.mensaje || 'No se pudo cargar el expediente.';
          this.cargando = false;

          this.cdr.detectChanges();
        });
      },
    });
  }

  /** Mapea los datos del expediente a las secciones visuales de la página. */
  private armarVista(exp: ExpedienteApi): void {
    this.resumen = {
      estado: this.valor(exp.estado?.nombre),
      proximoVencimiento: this.obtenerProximoVencimiento(exp),
      cumplidas: this.tareas.filter((t) => t.estado === 'Cumplida').length,
      pendientes: this.tareas.filter((t) => t.estado === 'Pendiente').length,
      vencidas: this.tareas.filter((t) => this.tareaEstaVencida(t)).length,
    };

    if (DEBUG_TAREAS) {
      console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] armarVista() conteo tareas');
      console.log('Total tareas:', this.tareas.length);
      console.log('Cumplidas:', this.tareas.filter((t) => t.estado === 'Cumplida').length);
      console.log('Pendientes:', this.tareas.filter((t) => t.estado === 'Pendiente').length);
      console.log('Vencidas:', this.tareas.filter((t) => this.tareaEstaVencida(t)).length);
      console.table(this.tareas);
      console.groupEnd();
    }

    this.datosGenerales = [
      { iconPath: ICON.doc, label: 'N° de Expediente', value: this.valor(exp.numeroInterno) },
      { iconPath: ICON.building, label: 'Área', value: this.valor(exp.area) },
      { iconPath: ICON.doc, label: 'Tipo de expediente', value: this.valor(exp.tipo?.nombre) },
      { iconPath: ICON.doc, label: 'Carátula', value: this.valor(exp.caratula) },
      { iconPath: ICON.user, label: 'Cliente', value: this.valor(exp.cliente?.nombre) },
      { iconPath: ICON.tag, label: 'Rol del Cliente', value: '-' },
      { iconPath: ICON.flag, label: 'Estado', value: this.valor(exp.estado?.nombre) },
      {
        iconPath: ICON.doc,
        label: 'Descripción / Objeto del expediente',
        value: this.valor(exp.descripcion),
        full: true,
      },
    ];

    this.datosJudiciales = [
      { iconPath: ICON.building, label: 'Fuero', value: this.valor(exp.fuero) },
      { iconPath: ICON.scale, label: 'Juzgado', value: this.valor(exp.juzgado) },
      { iconPath: ICON.book, label: 'Secretaría', value: this.valor(exp.secretaria) },
      { iconPath: ICON.mapPin, label: 'Jurisdicción', value: this.valor(exp.jurisdiccion) },
      { iconPath: ICON.doc, label: 'N° de causa PJN', value: this.valor(exp.numeroExpedienteJudicial) },
      { iconPath: ICON.layers, label: 'Instancia', value: this.valor(exp.instancia) },
    ];

    this.profesionales = [
      { iconPath: ICON.user, label: 'Abogado responsable', value: this.valor(exp.usuarioPrincipal?.nombre) },
      { iconPath: ICON.user, label: 'Abogado secundario', value: this.valor(exp.usuarioSecundario?.nombre) },
      { iconPath: ICON.user, label: 'Contraparte', value: this.valor(exp.contraparte) },
      { iconPath: ICON.user, label: 'Abogado contraparte', value: this.valor(exp.abogadoContraparte) },
    ];

    this.fechasClaves = [
      { iconPath: ICON.calendar, label: 'Fecha de inicio', value: this.formatearFecha(exp.fechaInicio) },
      { iconPath: ICON.calendar, label: 'Fecha de última actuación', value: this.formatearFecha(exp.fechaUltActuacion) },
      { iconPath: ICON.clock, label: 'Fecha procesal próximo', value: this.formatearFecha(exp.fechaProcesalProxima) },
    ];

    this.clasificacion = [
      { iconPath: ICON.flag, label: 'Prioridad', value: this.valor(exp.prioridad?.nombre) },
      { iconPath: ICON.tag, label: 'Etiqueta / Categoría', value: '-' },
      { iconPath: ICON.target, label: 'Origen del caso', value: this.valor(exp.origenCaso) },
    ];
  }

  /** Normaliza la respuesta del endpoint de documentos al modelo Documento[]. */
  private mapearDocumentos(respuesta: any): Documento[] {
    const registros = this.extraerArray(respuesta);

    return registros.map((doc: any) => {
      const nombre = doc.nombre_archivo ?? doc.nombreArchivo ?? doc.nombre ?? 'Documento sin nombre';

      const tipo =
        doc.tipoDocumento?.nombre ??
        doc.tipo_documento_nombre ??
        doc.nombreTipoDocumento ??
        doc.tipo ??
        'Documento';

      const fecha = this.formatearFecha(
        doc.fecha_documento ??
        doc.fechaDocumento ??
        doc.fecha_creacion ??
        doc.fechaCreacion
      );

      const autor =
        this.unirNombreApellido(doc.nombre_usuario_creacion, doc.apellido_usuario_creacion) ||
        doc.usuarioCreacion?.nombre ||
        doc.autor ||
        '-';

      return {
        id: doc.id,
        nombre,
        meta: `${tipo} - ${fecha} - ${autor}`,
        storageKey: doc.storage_key ?? doc.storageKey,
        urlDescarga: doc.urlDescarga ?? doc.url_descarga,
      };
    });
  }

  /** Normaliza la respuesta del endpoint de tareas al modelo Tarea[]. */
  private mapearTareas(respuesta: any): Tarea[] {
    const registros = this.extraerArray(respuesta);

    if (DEBUG_TAREAS) {
      console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] mapearTareas()');
      console.log('Respuesta original:', respuesta);
      console.log('Registros extraídos:', registros);
      console.log('Cantidad registros extraídos:', registros.length);
      console.table(registros);
      console.groupEnd();
    }

    return registros.map((tarea: any) => this.mapearTarea(tarea));
  }

  /** Normaliza la respuesta del endpoint de novedades al modelo Novedad[] y asocia tareas. */
  private mapearNovedades(respuesta: any): Novedad[] {
    const registros = this.extraerArray(respuesta);

    return registros.map((nov: any) => {
      const id =
        nov.id ??
        nov.idnovedad ??
        nov.idNovedad ??
        nov.novedad;

      const tipo =
        nov.tipoLabel ??
        nov.tipo?.nombre ??
        nov.tipoNovedad?.nombre ??
        nov.tipo_novedad_nombre ??
        nov.tipo_novedad ??
        nov.tipo ??
        'Novedad';

      const fecha = this.formatearFecha(
        nov.fechaActuacion ??
        nov.fecha_actuacion ??
        nov.fecha ??
        nov.fecha_creacion
      );

      const autor =
        this.unirNombreApellido(nov.nombre_usuario, nov.apellido_usuario) ||
        this.unirNombreApellido(nov.nombreUsuario, nov.apellidoUsuario) ||
        nov.usuario?.nombre ||
        nov.autor ||
        '-';

      const tareaRaw = nov.tarea ?? nov.tareaAsociada ?? null;
      const tareaDelEndpoint = this.buscarTareaPorNovedad(id);

      if (DEBUG_TAREAS) {
        console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] Mapeando novedad');
        console.log('Novedad raw:', nov);
        console.log('ID novedad detectado:', id);
        console.log('Tarea embebida en novedad:', tareaRaw);
        console.log('Tarea encontrada por endpoint:', tareaDelEndpoint);
        console.groupEnd();
      }

      return {
        id,
        tipo,
        badgeClasses: this.obtenerBadgeClasses(tipo),
        dotClasses: this.obtenerDotClasses(tipo),
        fecha,
        autor,
        titulo: nov.titulo ?? tipo,
        descripcion: nov.descripcion ?? '-',
        adjuntos: this.obtenerAdjuntos(nov),
        tarea: tareaDelEndpoint ?? (tareaRaw ? this.mapearTarea(tareaRaw) : undefined),
      };
    });
  }

  /** Normaliza un objeto tarea raw del backend al modelo Tarea interno, tolerando distintos nombres de campo. */
  private mapearTarea(tarea: any): Tarea {
    const estadoNombre =
      tarea.estadoTareaNombre ??
      tarea.estado_tarea_nombre ??
      tarea.nombreEstadoTarea ??
      tarea.nombre_estado_tarea ??
      tarea.estadoNombre ??
      tarea.estado_nombre ??
      tarea.nombre_estado ??
      tarea.estado_tarea?.nombre ??
      tarea.estadoTarea?.nombre ??
      tarea.estado?.nombre ??
      tarea.estado ??
      tarea.estado_tarea ??
      tarea.estadoTarea ??
      '';

    const estadoNormalizado = String(estadoNombre).toLowerCase().trim();

    const estadoId =
      tarea.estado_tarea_id ??
      tarea.estadoTareaId ??
      tarea.id_estado_tarea ??
      tarea.idEstadoTarea ??
      tarea.estado_tarea ??
      tarea.estadoTarea ??
      tarea.estado?.id ??
      null;

    const cumplida =
      tarea.cumplida === true ||
      tarea.cumplida === 1 ||
      tarea.cumplida === '1' ||
      tarea.cumplida === 'true' ||
      estadoNormalizado.includes('cumpl') ||
      estadoNormalizado.includes('complet') ||
      estadoNormalizado.includes('finaliz') ||
      estadoNormalizado.includes('termin');

    const fechaVencimientoRaw =
      tarea.fecha_vencimiento ??
      tarea.fechaVencimiento ??
      tarea.vencimiento ??
      null;

    const fechaCreacionRaw =
      tarea.fecha_creacion ??
      tarea.fechaCreacion ??
      tarea.creacion ??
      null;

    const fechaCompletadoRaw =
      tarea.fecha_completado ??
      tarea.fechaCompletado ??
      tarea.fecha_finalizacion ??
      tarea.fechaFinalizacion ??
      null;

    const prioridad =
      tarea.prioridadNombre ??
      tarea.prioridad_nombre ??
      tarea.nombrePrioridad ??
      tarea.nombre_prioridad ??
      tarea.prioridad?.nombre ??
      tarea.prioridad ??
      '-';

    const prioridadId =
      tarea.prioridad_id ??
      tarea.prioridadId ??
      tarea.id_prioridad ??
      tarea.idPrioridad ??
      tarea.prioridad?.id ??
      null;

    const usuarioCreacion =
      this.unirNombreApellido(tarea.nombre_usuario_creacion, tarea.apellido_usuario_creacion) ||
      this.unirNombreApellido(tarea.nombreUsuarioCreacion, tarea.apellidoUsuarioCreacion) ||
      tarea.usuarioCreacion?.nombre ||
      tarea.usuario_creacion_nombre ||
      tarea.usuarioCreacionNombre ||
      '-';

    const usuarioCompletado =
      this.unirNombreApellido(tarea.nombre_usuario_completado, tarea.apellido_usuario_completado) ||
      this.unirNombreApellido(tarea.nombreUsuarioCompletado, tarea.apellidoUsuarioCompletado) ||
      tarea.usuarioCompletado?.nombre ||
      tarea.usuario_completado_nombre ||
      tarea.usuarioCompletadoNombre ||
      '-';

    const tareaMapeada: Tarea = {
      id: tarea.id ?? tarea.idtarea ?? tarea.idTarea,
      novedadId: tarea.novedad ?? tarea.novedadId ?? tarea.idNovedad ?? null,
      titulo: tarea.titulo ?? tarea.descripcion ?? 'Tarea asociada',
      descripcion: tarea.descripcion,
      vencimiento: this.formatearFecha(fechaVencimientoRaw),
      fechaVencimientoRaw,
      fechaCreacion: this.formatearFecha(fechaCreacionRaw),
      fechaCreacionRaw,
      fechaCompletado: this.formatearFecha(fechaCompletadoRaw),
      fechaCompletadoRaw,
      estado: cumplida ? 'Cumplida' : 'Pendiente',
      estadoNombre: this.valor(estadoNombre),
      estadoId,
      prioridad: this.valor(prioridad),
      prioridadId,
      usuarioCreacion,
      usuarioCompletado,
      activo: tarea.activo,
    };

    if (DEBUG_TAREAS) {
      console.groupCollapsed(`[EXPEDIENTE VIEW DEBUG] mapearTarea(): ${tareaMapeada.titulo}`);
      console.log('TAREA RAW:', tarea);
      console.log('Campos posibles de estado:', {
        cumplida: tarea.cumplida,
        estado: tarea.estado,
        estado_tarea: tarea.estado_tarea,
        estadoTarea: tarea.estadoTarea,
        estadoTareaNombre: tarea.estadoTareaNombre,
        estado_tarea_nombre: tarea.estado_tarea_nombre,
        nombreEstadoTarea: tarea.nombreEstadoTarea,
        nombre_estado_tarea: tarea.nombre_estado_tarea,
        estadoNombre: tarea.estadoNombre,
        estado_nombre: tarea.estado_nombre,
      });
      console.log('Estado detectado:', {
        estadoNombre,
        estadoNormalizado,
        estadoId,
        cumplidaDetectada: cumplida,
      });
      console.log('Fecha vencimiento detectada:', {
        fechaVencimientoRaw,
        fechaFormateada: tareaMapeada.vencimiento,
      });
      console.log('TAREA MAPEADA:', tareaMapeada);
      console.groupEnd();
    }

    return tareaMapeada;
  }

  /** Ordena las tareas por fecha de vencimiento ascendente (las más próximas primero). */
  private ordenarTareasPorFecha(tareas: Tarea[]): Tarea[] {
    return [...tareas].sort((a, b) => {
      const fechaA = this.obtenerFechaOrdenTarea(a);
      const fechaB = this.obtenerFechaOrdenTarea(b);

      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return 1;
      if (!fechaB) return -1;

      return fechaA.getTime() - fechaB.getTime();
    });
  }

  private obtenerFechaOrdenTarea(tarea: Tarea): Date | null {
    return (
      this.parsearFechaFlexible(tarea.fechaVencimientoRaw) ??
      this.parsearFechaFlexible(tarea.fechaCreacionRaw) ??
      this.parsearFechaArgentina(tarea.vencimiento) ??
      this.parsearFechaArgentina(tarea.fechaCreacion ?? '')
    );
  }

  toggleHistorialTareas(): void {
    this.mostrarHistorialTareas = !this.mostrarHistorialTareas;
    this.cdr.detectChanges();
  }

  getTareaEstadoClasses(tarea: Tarea): string {
    if (tarea.estado === 'Cumplida') {
      return 'bg-green-50 text-green-600';
    }

    if (this.tareaEstaVencida(tarea)) {
      return 'bg-red-50 text-red-600';
    }

    return 'bg-amber-50 text-amber-600';
  }

  getTareaEstadoTexto(tarea: Tarea): string {
    if (tarea.estado === 'Cumplida') {
      return 'Cumplida';
    }

    if (this.tareaEstaVencida(tarea)) {
      return 'Vencida';
    }

    return 'Pendiente';
  }

  getTareaDotClasses(tarea: Tarea): string {
    if (tarea.estado === 'Cumplida') {
      return 'border-green-400';
    }

    if (this.tareaEstaVencida(tarea)) {
      return 'border-red-400';
    }

    return 'border-amber-400';
  }

  /** Busca en el array de tareas cargadas la que corresponde a una novedad por su ID. */
  private buscarTareaPorNovedad(novedadId: number | string | undefined): Tarea | undefined {
    if (novedadId === undefined || novedadId === null || novedadId === '') {
      return undefined;
    }

    const encontrada = this.tareas.find((t) => {
      if (t.novedadId === undefined || t.novedadId === null || t.novedadId === '') {
        return false;
      }

      return String(t.novedadId) === String(novedadId);
    });

    if (DEBUG_TAREAS) {
      console.log('[EXPEDIENTE VIEW DEBUG] buscarTareaPorNovedad()', {
        novedadId,
        encontrada,
        tareasDisponibles: this.tareas,
      });
    }

    return encontrada;
  }

  private obtenerAdjuntos(nov: any): string[] {
    if (Array.isArray(nov.adjuntos)) {
      return nov.adjuntos.map((a: any) => {
        if (typeof a === 'string') return a;
        return a.nombre_archivo ?? a.nombreArchivo ?? a.nombre ?? 'Adjunto';
      });
    }

    if (Array.isArray(nov.documentos)) {
      return nov.documentos.map((d: any) => d.nombre_archivo ?? d.nombreArchivo ?? d.nombre ?? 'Documento');
    }

    return [];
  }

  private obtenerProximoVencimiento(exp: ExpedienteApi): string {
    const vencimientosPendientes = this.tareas
      .filter((t) => t.estado === 'Pendiente' && t.vencimiento !== '-')
      .map((t) => this.parsearFechaArgentina(t.vencimiento))
      .filter((f): f is Date => !!f)
      .sort((a, b) => a.getTime() - b.getTime());

    if (DEBUG_TAREAS) {
      console.groupCollapsed('[EXPEDIENTE VIEW DEBUG] obtenerProximoVencimiento()');
      console.log('Tareas pendientes con vencimiento:', this.tareas.filter((t) => t.estado === 'Pendiente' && t.vencimiento !== '-'));
      console.log('Fechas parseadas y ordenadas:', vencimientosPendientes);
      console.log('Fallback exp.fechaVencimiento:', exp.fechaVencimiento);
      console.log('Fallback exp.fechaProcesalProxima:', exp.fechaProcesalProxima);
      console.groupEnd();
    }

    if (vencimientosPendientes.length) {
      return this.formatearFecha(vencimientosPendientes[0]);
    }

    return this.formatearFecha(exp.fechaVencimiento ?? exp.fechaProcesalProxima);
  }

  /** Determina si una tarea pendiente tiene la fecha de vencimiento anterior a hoy. */
  private tareaEstaVencida(tarea?: Tarea): boolean {
    if (!tarea || tarea.estado === 'Cumplida' || tarea.vencimiento === '-') {
      return false;
    }

    const fecha = this.parsearFechaArgentina(tarea.vencimiento);
    if (!fecha) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    fecha.setHours(0, 0, 0, 0);

    return fecha < hoy;
  }

  /** Parsea una fecha en formato dd/mm/aaaa (string argentino) a Date. Retorna null si el formato es inválido. */
  private parsearFechaArgentina(fecha: string): Date | null {
    if (!fecha) return null;

    const partes = fecha.split('/');

    if (partes.length !== 3) {
      return null;
    }

    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const anio = Number(partes[2]);

    if (!dia || mes < 0 || !anio) {
      return null;
    }

    return new Date(anio, mes, dia);
  }

  /** Parsea fechas en cualquier formato soportado por el constructor Date, incluyendo ISO strings. Retorna null si no es válida. */
  private parsearFechaFlexible(valor: string | Date | null | undefined): Date | null {
    if (!valor) return null;

    if (valor instanceof Date) {
      return Number.isNaN(valor.getTime()) ? null : valor;
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return null;
    }

    return fecha;
  }

  /** Retorna las clases Tailwind del badge de tipo de novedad según el nombre del tipo. */
  private obtenerBadgeClasses(tipo: string): string {
    const normalizado = tipo.toLowerCase();

    if (normalizado.includes('audiencia')) return 'bg-amber-50 text-amber-600';
    if (normalizado.includes('resol')) return 'bg-red-50 text-red-600';
    if (normalizado.includes('present')) return 'bg-blue-50 text-blue-600';
    if (normalizado.includes('oficio')) return 'bg-violet-50 text-violet-600';

    return 'bg-gray-100 text-gray-600';
  }

  /** Retorna las clases Tailwind del punto indicador del timeline según el tipo de novedad. */
  private obtenerDotClasses(tipo: string): string {
    const normalizado = tipo.toLowerCase();

    if (normalizado.includes('audiencia')) return 'border-amber-400';
    if (normalizado.includes('resol')) return 'border-red-400';
    if (normalizado.includes('present')) return 'border-blue-400';
    if (normalizado.includes('oficio')) return 'border-violet-400';

    return 'border-gray-400';
  }

  /** Formatea cualquier valor de fecha a string en formato dd/mm/aaaa usando locale es-AR. Retorna '-' si el valor es nulo o inválido. */
  private formatearFecha(valor: string | Date | null | undefined): string {
    if (!valor) return '-';

    const fecha = valor instanceof Date ? valor : new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  /** Convierte un valor a string. Retorna '-' si es null, undefined o string vacío. */
  private valor(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }

    return String(valor);
  }

  /** Une nombre y apellido en un solo string, ignorando los valores falsy. */
  private unirNombreApellido(nombre?: string, apellido?: string): string {
    return [nombre, apellido].filter(Boolean).join(' ').trim();
  }

  /** Extrae el array de registros de distintas estructuras de respuesta del backend. */
  private extraerArray(respuesta: any): any[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (Array.isArray(respuesta?.data)) {
      return respuesta.data;
    }

    if (Array.isArray(respuesta?.tareas)) {
      return respuesta.tareas;
    }

    if (Array.isArray(respuesta?.documentos)) {
      return respuesta.documentos;
    }

    if (Array.isArray(respuesta?.novedades)) {
      return respuesta.novedades;
    }

    return [];
  }

  /** Abre el documento en una nueva pestaña usando su URL o el endpoint de descarga por ID. */
  descargarDocumento(doc: Documento): void {
    if (doc.urlDescarga) {
      window.open(doc.urlDescarga, '_blank');
      return;
    }

    if (doc.id) {
      window.open(`${environment.apiUrl}/documentos/${doc.id}/descargar`, '_blank');
      return;
    }

    console.warn('El documento no tiene URL de descarga ni ID:', doc);
  }

  /** Descarga el PDF del expediente completo desde el endpoint correspondiente. */
  descargarPdf(): void {
    if (!this.expediente?.id) {
      return;
    }

    window.open(`${environment.apiUrl}/expedientes/${this.expediente.id}/pdf`, '_blank');
  }

  // Retorna a la página de gestión de expedientes. Se usa en el botón "Volver" del header.
  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}