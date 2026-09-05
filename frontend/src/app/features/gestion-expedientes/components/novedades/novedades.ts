import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { NovedadesFilter, NovedadFilterState } from '../novedades-filter/novedades-filter';
import { NovedadesCard, Novedad, ArchivoNovedad } from '../novedades-card/novedades-card';
import { ModalNovedad, NovedadPayloadConDocumentos } from '../modal-novedad/modal-novedad';
import { toast } from 'ngx-sonner';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';
import { Storage } from '../../../../core/services/storage';

/**
 * Sub-página de novedades de un expediente.
 * Carga novedades, documentos asociados y tareas en paralelo.
 * Gestiona alta, edición y eliminación de novedades con sus documentos y tareas asociadas.
 */
@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, NovedadesFilter, NovedadesCard, ModalNovedad, PrimaryBtn, UiConfirmModal],
  templateUrl: './novedades.html',
})
export class Novedades implements OnInit {
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);
  private http    = inject(HttpClient);
  private cdr     = inject(ChangeDetectorRef);
  private storage = inject(Storage);
  private expedienteId!: number; // ID del expediente extraído del parámetro de ruta del componente padre.
  private usuarioId!: number; // ID del usuario autenticado, extraído del JWT para asignarlo como creador en los POST.

  /** Lista completa de novedades del expediente sin filtrar. */
  allNovedades: Novedad[] = [];

  /** Lista de novedades filtrada según los criterios activos del componente de filtros. */
  filteredNovedades: Novedad[] = [];

  tipoNovedadOptions: { value: string; label: string }[] = [];
  prioridadOptions:   { value: string; label: string }[] = [];
  estadoTareaOptions: { value: string; label: string }[] = [];
  usuarioOptions:     { value: string; label: string }[] = [];

  tipoDocumentoOptions: { value: string; label: string }[] = [];

  /** Mapa de clave normalizada → id numérico del tipo de documento, usado al subir archivos. */
  private tipoDocumentoIdMap: Record<string, number> = {};

  /** Indica si el modal de creación/edición de novedad está abierto. */
  modalOpen = false;

  /** Nueva novedad en edición. */
  novedadEditando: Novedad | null = null;

  /** Novedad seleccionada para eliminar. Controla la apertura del modal de confirmación. */
  novedadAEliminar: Novedad | null = null;
  confirmEliminarOpen = false;

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));
    this.usuarioId = this.obtenerUsuarioIdDelToken();
    this.cargarNovedades();
    this.cargarCatalogos();
  }

  /** Decodifica el JWT almacenado y extrae el id del usuario autenticado. */
  private obtenerUsuarioIdDelToken(): number {
    try {
      const token = this.storage.getToken() ?? '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Number(payload.id);
    } catch {
      return 0;
    }
  }

  /** Carga novedades y documentos en paralelo, luego obtiene la tarea de cada novedad y arma el modelo. */
  private cargarNovedades(): void {
    forkJoin({
      novedades: this.http.get<any[]>(`${environment.apiUrl}/expedientes/${this.expedienteId}/novedades`),
      documentos: this.http.get<any[]>(`${environment.apiUrl}/documento?expediente=${this.expedienteId}`),
    }).subscribe({
      next: ({ novedades, documentos }) => {
        const documentosPorNovedad = this.agruparDocumentosPorNovedad(documentos);

        const tareaRequests = novedades.map(n =>
          this.http.get<any[]>(`${environment.apiUrl}/tarea?novedad=${n.id}`)
        );

        Promise.all(
          tareaRequests.map((req, i) =>
            new Promise<any>(resolve => {
              req.subscribe({
                next: (tareas) => resolve({ novedad: novedades[i], tarea: tareas[0] ?? null }),
                error: ()      => resolve({ novedad: novedades[i], tarea: null }),
              });
            })
          )
        ).then(results => {
          this.allNovedades = results.map(({ novedad: n, tarea: t }) => ({
            id:             String(n.id),
            tipo:           n.tipoNovedad ? String(n.tipoNovedad.id) : '',
            tipoLabel:      n.tipoNovedad?.nombre ?? 'Observación',
            fechaActuacion: n.fecha,
            titulo:         n.titulo,
            descripcion:    n.descripcion ?? '',
            responsable:    n.usuarioCreacion?.nombre ?? '—',

            // Acá quedan los documentos asociados a esta novedad
            archivos:       documentosPorNovedad.get(String(n.id)) ?? [],

            tarea: t ? {
              id:                       String(t.id),
              titulo:                   t.titulo,
              prioridad:                t.prioridad ? String(t.prioridad) : '',
              fechaVencimiento:         t.fecha_vencimiento ?? '',
              hora:                     t.hora ?? '',
              responsableNombre:        t.nombre_usuario_completado
                                          ? `${t.nombre_usuario_completado} ${t.apellido_usuario_completado ?? ''}`.trim()
                                          : '—',
              responsable:              t.usuario_completado ? String(t.usuario_completado) : '',
              descripcionInstrucciones: t.descripcion ?? '',
              cumplida:                 t.nombre_estado_tarea === 'Cumplido',
            } : undefined,
          }));

          this.filteredNovedades = [...this.allNovedades];
          this.cdr.detectChanges();
        });
      },
      error: () => toast.error('Error al cargar novedades'),
    });
  }

  /** Agrupa la lista plana de documentos en un Map indexado por ID de novedad. */
  private agruparDocumentosPorNovedad(documentos: any[]): Map<string, ArchivoNovedad[]> {
    const documentosPorNovedad = new Map<string, ArchivoNovedad[]>();

    documentos.forEach(doc => {
      if (!doc.novedad) return;

      const novedadId = String(doc.novedad);

      if (!documentosPorNovedad.has(novedadId)) {
        documentosPorNovedad.set(novedadId, []);
      }

      documentosPorNovedad.get(novedadId)!.push({
        id: String(doc.id),
        nombre: doc.nombre_archivo ?? 'Documento sin nombre',
        url: doc.storage_key ?? '#',
        tipoLabel: doc.nombre_tipo_documento ?? '',
        fechaDocumento: doc.fecha_documento ? String(doc.fecha_documento).slice(0, 10) : '',
      });
    });

    return documentosPorNovedad;
  }

  /** Carga todos los enums y catálogos necesarios para los selectores del modal de novedad. */
  private cargarCatalogos(): void {
    this.http.get<any[]>(`${environment.apiUrl}/enums/tiponovedad`).subscribe({
      next: (res) => {
        this.tipoNovedadOptions = res
          .filter(t => t.nombre?.toLowerCase() !== 'todos')
          .map(t => ({
            value: String(t.id),
            label: t.nombre,
          }));
        this.cdr.detectChanges();
      },
      error: () => toast.error('Error al cargar tipos de novedad'),
    });

    this.http.get<any[]>(`${environment.apiUrl}/enums/prioridad`).subscribe({
      next: (res) => {
        this.prioridadOptions = res.map(p => ({
          value: String(p.id),
          label: p.nombre,
        }));
        this.cdr.detectChanges();
      },
      error: () => toast.error('Error al cargar prioridades'),
    });

    this.http.get<any[]>(`${environment.apiUrl}/enums/estadotarea`).subscribe({
      next: (res) => {
        this.estadoTareaOptions = res.map(e => ({
          value: String(e.id),
          label: e.nombre,
        }));
        this.cdr.detectChanges();
      },
      error: () => toast.error('Error al cargar estados de tarea'),
    });

    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (res) => {
        this.usuarioOptions = res.map(u => ({
          value: String(u.id),
          label: `${u.nombre} ${u.apellido}`,
        }));
        this.cdr.detectChanges();
      },
      error: () => toast.error('Error al cargar usuarios'),
    });

    this.http.get<any[]>(`${environment.apiUrl}/enums/tipodocumento`).subscribe({
      next: (res) => {
        this.tipoDocumentoOptions = res.map(t => ({
          value: this.normalizarTipoDocumento(t.nombre),
          label: t.nombre,
        }));
        this.cdr.detectChanges();
        this.tipoDocumentoIdMap = Object.fromEntries(
          res.map(t => [
            this.normalizarTipoDocumento(t.nombre),
            Number(t.id),
          ])
        );
      },
      error: () => toast.error('Error al cargar tipos de documento'),
    });
  }

  /** Normaliza el nombre de un tipo de documento a clave sin tildes, espacios ni minúsculas. */
  private normalizarTipoDocumento(nombre: string): string {
    return nombre
      .toUpperCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Retorna las novedades filtradas ordenadas por fecha descendente (más reciente primero). */
  get novedadesOrdenadas(): Novedad[] {
    return [...this.filteredNovedades].sort(
      (a, b) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
    );
  }

  /** Maneja los cambios en los filtros de búsqueda. */
  onFiltersChange(f: NovedadFilterState) {
    this.filteredNovedades = this.allNovedades.filter(n =>
      (!f.buscar || n.titulo.toLowerCase().includes(f.buscar.toLowerCase()) ||
                    n.descripcion.toLowerCase().includes(f.buscar.toLowerCase())) &&
      (!f.tipo   || n.tipo === f.tipo)
    );
  }

  /** Abre el modal para crear una nueva novedad. */
  abrirAlta() {
    this.novedadEditando = null;
    this.modalOpen = true;
  }

  /** Abre el modal para editar una novedad existente. */
  onEditar(novedad: Novedad) {
    this.novedadEditando = novedad;
    this.modalOpen = true;
  }

  /** Abre el modal de confirmación para eliminar una novedad. */
  onEliminar(novedad: Novedad) {
    this.novedadAEliminar = novedad;
    this.confirmEliminarOpen = true;
  }

  /** Confirma la eliminación de una novedad. */
  confirmarEliminar() {
    if (!this.novedadAEliminar) return;

    this.http.delete<any>(`${environment.apiUrl}/novedades/${this.novedadAEliminar.id}`)
      .subscribe({
        next: () => {
          this.allNovedades = this.allNovedades.filter(n => n.id !== this.novedadAEliminar!.id);
          this.filteredNovedades = this.filteredNovedades.filter(n => n.id !== this.novedadAEliminar!.id);
          toast.success('Novedad eliminada');
          this.confirmEliminarOpen = false;
          this.novedadAEliminar = null;
          this.cdr.detectChanges();
        },
        error: () => toast.error('Error al eliminar la novedad'),
      });
  }

  /** Persiste la novedad (POST o PUT), luego sube los documentos adjuntos y sincroniza la tarea. */
  onGuardar(payload: NovedadPayloadConDocumentos) {
    if (this.novedadEditando) {
      const novedadId = Number(this.novedadEditando.id);

      this.http.put<any>(`${environment.apiUrl}/novedades/${novedadId}`, {
        titulo:        payload.titulo,
        descripcion:   payload.descripcion,
        fecha_novedad: payload.fechaActuacion,
        tipo_novedad:  payload.tipo ? Number(payload.tipo) : null,
      }).subscribe({
        next: () => {
          this.subirDocumentosAdjuntos(novedadId, payload).subscribe({
            next: () => {
              this.sincronizarTarea$(novedadId, payload).subscribe({
                next: () => this.finalizarGuardado(),
                error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al guardar la tarea'),
              });
            },
            error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al subir documentos'),
          });
        },
        error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al actualizar la novedad'),
      });

    } else {
      this.http.post<any>(`${environment.apiUrl}/novedades`, {
        expediente:       this.expedienteId,
        titulo:           payload.titulo,
        descripcion:      payload.descripcion,
        fecha_novedad:    payload.fechaActuacion,
        es_procesal:      false,
        tipo_novedad:     payload.tipo ? Number(payload.tipo) : null,
        usuario_creacion: this.usuarioId,
      }).subscribe({
        next: (novedadCreada) => {
          const novedadId = Number(novedadCreada.id);

          this.subirDocumentosAdjuntos(novedadId, payload).subscribe({
            next: () => {
              this.sincronizarTarea$(novedadId, payload).subscribe({
                next: () => this.finalizarGuardado(),
                error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al guardar la tarea'),
              });
            },
            error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al subir documentos'),
          });
        },
        error: (err) => toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al crear la novedad'),
      });
    }
  }

  /** Sube en paralelo todos los documentos adjuntos nuevos asociándolos a la novedad creada/editada. */
  private subirDocumentosAdjuntos(novedadId: number, payload: NovedadPayloadConDocumentos): Observable<any> {
    const documentos = payload.documentosAdjuntos ?? [];

    if (documentos.length === 0) {
      return of(null);
    }

    const requests = documentos.map(doc => {
      const tipoDocumentoId = this.tipoDocumentoIdMap[doc.tipo] ?? this.tipoDocumentoIdMap['OTRO'];

      const fd = new FormData();
      fd.append('archivo',          doc.archivo);
      fd.append('expediente',       String(this.expedienteId));
      fd.append('tipo_documento',   String(tipoDocumentoId));
      fd.append('usuario_creacion', String(this.usuarioId));
      fd.append('novedad',          String(novedadId));

      if (doc.descripcion) {
        fd.append('descripcion', doc.descripcion);
      }

      if (doc.fechaDocumento) {
        fd.append('fecha_documento', doc.fechaDocumento);
      }

      return this.http.post<any>(`${environment.apiUrl}/subirDocumento`, fd);
    });

    return forkJoin(requests).pipe(
      catchError((err) => {
        toast.error(err?.error?.mensaje ?? err?.error ?? 'Error al subir uno o más documentos');
        return throwError(() => err);
      })
    );
  }

  /** Crea, actualiza o elimina la tarea asociada a la novedad según el estado del payload. */
  private sincronizarTarea$(novedadId: number, payload: NovedadPayloadConDocumentos): Observable<any> {
    const tareaExistente = this.novedadEditando?.tarea;
    const tareaPayload   = payload.tarea;

    if (tareaPayload) {
      const estadoPendiente = this.estadoTareaOptions.find(e => e.label === 'Pendiente');
      const estadoCumplido  = this.estadoTareaOptions.find(e => e.label === 'Cumplido');

      const estadoId = tareaPayload.cumplida
        ? Number(estadoCumplido?.value)
        : Number(estadoPendiente?.value);

      const body = {
        titulo:             tareaPayload.titulo,
        descripcion:        tareaPayload.descripcionInstrucciones ?? '',
        expediente:         this.expedienteId,
        novedad:            novedadId,
        usuario_creacion:   this.usuarioId,
        usuario_completado: tareaPayload.responsable ? Number(tareaPayload.responsable) : null,
        prioridad:          Number(tareaPayload.prioridad),
        estado_tarea:       estadoId,
        fecha_vencimiento:  tareaPayload.fechaVencimiento || null,
        hora:               tareaPayload.hora?.trim() || null,
      };

      if (tareaExistente?.id) {
        return this.http.put<any>(`${environment.apiUrl}/tarea/${tareaExistente.id}`, body);
      }
      return this.http.post<any>(`${environment.apiUrl}/insertarTarea`, body);
    }

    if (tareaExistente?.id) {
      return this.http.delete<any>(`${environment.apiUrl}/tarea/${tareaExistente.id}`);
    }

    return of(null);
  }

  /** Retorna a la página de gestión de expedientes. */
  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  /** Mensaje dinámico del modal de confirmación con el título de la novedad a eliminar. */
  get mensajeConfirmar(): string {
    return `¿Estás seguro que querés eliminar la novedad "${this.novedadAEliminar?.titulo ?? ''}"? Esta acción no se puede deshacer.`;
  }

  /** Cierra el modal, muestra el toast de éxito y recarga las novedades tras un guardado exitoso. */
  private finalizarGuardado(): void {
    const mensaje = this.novedadEditando
      ? 'Novedad actualizada correctamente'
      : 'Novedad creada correctamente';

    this.modalOpen = false;
    this.novedadEditando = null;
    toast.success(mensaje);
    setTimeout(() => this.cargarNovedades(), 0);
  }
}