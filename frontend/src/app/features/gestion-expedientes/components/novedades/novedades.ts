import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { NovedadesFilter, NovedadFilterState } from '../novedades-filter/novedades-filter';
import { NovedadesCard, Novedad } from '../novedades-card/novedades-card';
import { ModalNovedad } from '../modal-novedad/modal-novedad';
import { toast } from 'ngx-sonner';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { UiConfirmModal } from '../../../../shared/components/ui-confirm-modal/ui-confirm-modal';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, NovedadesFilter, NovedadesCard, ModalNovedad, PrimaryBtn, UiConfirmModal],
  templateUrl: './novedades.html',
})
export class Novedades implements OnInit {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);
  private cdr    = inject(ChangeDetectorRef);
  private expedienteId!: number;

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));
    this.cargarNovedades();
    this.cargarCatalogos();
  }

  private cargarNovedades(): void {
    this.http.get<any[]>(`${environment.apiUrl}/expedientes/${this.expedienteId}/novedades`)
      .subscribe({
        next: (novedades) => {
          // Para cada novedad traemos su tarea asociada si existe
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
              archivos:       [],
              tarea: t ? {
                id:                       String(t.id),
                titulo:                   t.titulo,
                prioridad:                t.prioridad ? String(t.prioridad) : '',
                fechaVencimiento:         t.fecha_vencimiento ?? '',
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
        }
      });
  }

  private cargarCatalogos(): void {
    this.http.get<any[]>(`${environment.apiUrl}/enums/tiponovedad`).subscribe({
      next: (res) => {
        this.tipoNovedadOptions = res.map(t => ({ value: String(t.id), label: t.nombre }));
      }
    });
    this.http.get<any[]>(`${environment.apiUrl}/enums/prioridad`).subscribe({
      next: (res) => {
        this.prioridadOptions = res.map(p => ({ value: String(p.id), label: p.nombre }));
      }
    });
    this.http.get<any[]>(`${environment.apiUrl}/enums/estadotarea`).subscribe({
      next: (res) => {
        this.estadoTareaOptions = res.map(e => ({ value: String(e.id), label: e.nombre }));
      }
    });
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe({
      next: (res) => {
        this.usuarioOptions = res.map(u => ({ value: String(u.id), label: `${u.nombre} ${u.apellido}` }));
      }
    });
  }

  allNovedades: Novedad[] = [];
  filteredNovedades: Novedad[] = [];

  tipoNovedadOptions: { value: string; label: string }[] = [];
  prioridadOptions:   { value: string; label: string }[] = [];
  estadoTareaOptions: { value: string; label: string }[] = [];
  usuarioOptions:     { value: string; label: string }[] = [];

  modalOpen = false;
  novedadEditando: Novedad | null = null;

  get novedadesOrdenadas(): Novedad[] {
    // Orden descendente por fecha (más reciente = número más alto en el timeline)
    return [...this.filteredNovedades].sort(
      (a, b) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
    );
  }

  onFiltersChange(f: NovedadFilterState) {
    this.filteredNovedades = this.allNovedades.filter(n =>
      (!f.buscar || n.titulo.toLowerCase().includes(f.buscar.toLowerCase()) ||
                    n.descripcion.toLowerCase().includes(f.buscar.toLowerCase())) &&
      (!f.tipo   || n.tipo === f.tipo)
    );
  }

  abrirAlta() {
    this.novedadEditando = null;
    this.modalOpen = true;
  }

  onEditar(novedad: Novedad) {
    this.novedadEditando = novedad;
    this.modalOpen = true;
  }

  novedadAEliminar: Novedad | null = null;
  confirmEliminarOpen = false;

  onEliminar(novedad: Novedad) {
    this.novedadAEliminar = novedad;
    this.confirmEliminarOpen = true;
  }

  confirmarEliminar() {
    if (!this.novedadAEliminar) return;
    this.http.delete(`${environment.apiUrl}/novedades/${this.novedadAEliminar.id}`)
      .subscribe({
        next: () => {
          this.allNovedades = this.allNovedades.filter(n => n.id !== this.novedadAEliminar!.id);
          this.filteredNovedades = this.filteredNovedades.filter(n => n.id !== this.novedadAEliminar!.id);
          toast.success('Novedad eliminada');
          this.confirmEliminarOpen = false;
          this.novedadAEliminar = null;
        }
      });
  }

  onGuardar(payload: Partial<Novedad>) {
    if (this.novedadEditando) {
      this.http.put(`${environment.apiUrl}/novedades/${this.novedadEditando.id}`, {
        titulo:        payload.titulo,
        descripcion:   payload.descripcion,
        fecha_novedad: payload.fechaActuacion,
        tipo_novedad:  payload.tipo ? Number(payload.tipo) : null,
      }).subscribe({
        next: () => this.sincronizarTarea(Number(this.novedadEditando!.id), payload)
      });
    } else {
      this.http.post<any>(`${environment.apiUrl}/novedades`, {
        expediente:       this.expedienteId,
        titulo:           payload.titulo,
        descripcion:      payload.descripcion,
        fecha_novedad:    payload.fechaActuacion,
        es_procesal:      false,
        tipo_novedad:     payload.tipo ? Number(payload.tipo) : null,
        usuario_creacion: 1,
      }).subscribe({
        next: (novedadCreada) => this.sincronizarTarea(novedadCreada.id, payload)
      });
    }
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  get mensajeConfirmar(): string {
    return `¿Estás seguro que querés eliminar la novedad "${this.novedadAEliminar?.titulo ?? ''}"? Esta acción no se puede deshacer.`;
  }

  private finalizarGuardado(): void {
    const mensaje = this.novedadEditando ? 'Novedad actualizada correctamente' : 'Novedad creada correctamente';
    this.cargarNovedades();
    this.modalOpen = false;
    this.novedadEditando = null;
    toast.success(mensaje);
  }

  private sincronizarTarea(novedadId: number, payload: Partial<Novedad>): void {
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
        usuario_creacion:   1,
        usuario_completado: tareaPayload.responsable ? Number(tareaPayload.responsable) : null,
        prioridad:          Number(tareaPayload.prioridad),
        estado_tarea:       estadoId,
        fecha_vencimiento:  tareaPayload.fechaVencimiento || null,
        activo:             true,
      };

      if (tareaExistente?.id) {
        this.http.put(`${environment.apiUrl}/tarea/${tareaExistente.id}`, body)
          .subscribe({ next: () => this.finalizarGuardado() });
      } else {
        this.http.post(`${environment.apiUrl}/insertarTarea`, body)
          .subscribe({ next: () => this.finalizarGuardado() });
      }
    } else if (tareaExistente?.id) {
      this.http.delete(`${environment.apiUrl}/tarea/${tareaExistente.id}`)
        .subscribe({ next: () => this.finalizarGuardado() });
    } else {
      this.finalizarGuardado();
    }
  }
}