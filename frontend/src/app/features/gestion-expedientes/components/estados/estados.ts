import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { toast } from 'ngx-sonner';
import { environment } from '../../../../../environments/environment';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { EstadosService } from '../../services/estados.service';
import { EstadoDefinicion, EstadoExpedienteRuntime, EstadoRegistrado, TareaChecklist } from '../../models/estado.model';
import { TareaChecklistItem } from '../tarea-checklist-item/tarea-checklist-item';
import { TareaChecklistDetalle, TareaChecklistPayload } from '../tarea-checklist-detalle/tarea-checklist-detalle';
import { Auth } from '../../../../core/services/auth';

/**
 * Pestaña "Estados" del expediente.
 * Muestra el pipeline completo de estados posibles del flujo (grisado el que no fue transitado
 * aún, resaltado el actual), y el checklist del estado en vista como filas expandibles.
 */
@Component({
  selector: 'app-estados',
  standalone: true,
  imports: [CommonModule, PrimaryBtn, TareaChecklistItem, TareaChecklistDetalle],
  templateUrl: './estados.html',
})
export class Estados implements OnInit {
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);
  private router = inject(Router);
  private estadosService = inject(EstadosService);
  private cdr    = inject(ChangeDetectorRef);
  private auth = inject(Auth);

  private expedienteId!: number;
  expediente: any = null;

  private tipoDocumentoOtroId: number | null = null;

  cargando = true;
  flujo: EstadoDefinicion[] = [];
  runtime: EstadoExpedienteRuntime | null = null;

  /** Nombre del estado que se está mostrando en pantalla (puede ser uno pasado, de solo lectura). */
  estadoSeleccionadoVista = '';

  /** Id de la tarea actualmente abierta (panel lateral o desplegado, según el ancho de pantalla). */
  tareaSeleccionadaId: string | null = null;

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));
    this.cargarTipoDocumentoOtro();
    this.cargarDatos();
  }

  private cargarTipoDocumentoOtro(): void {
      this.http.get<any[]>(`${environment.apiUrl}/enums/tipodocumento`).subscribe({
        next: (tipos) => {
          this.tipoDocumentoOtroId = tipos.find(t => t.nombre === 'Otro')?.id ?? null;
        }
      });
  }

  private cargarDatos(): void {
    this.http.get<any>(`${environment.apiUrl}/expedientes/${this.expedienteId}`).subscribe({
      next: (exp) => {
        this.expediente = exp;
        const tipoId = exp.tipo?.id;

        forkJoin({
          flujo:   this.estadosService.obtenerFlujo(Number(tipoId)),
          runtime: this.estadosService.obtenerEstadoActual(this.expedienteId, Number(tipoId)),
        }).subscribe(({ flujo, runtime }) => {
          this.flujo = flujo;
          this.runtime = runtime;
          this.estadoSeleccionadoVista = runtime.estadoActual;
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: () => toast.error('Error al cargar el expediente'),
    });
  }

  get estadoVista(): EstadoRegistrado | undefined {
    return this.runtime?.historial.find(h => h.nombre === this.estadoSeleccionadoVista);
  }

  get tareaSeleccionada(): TareaChecklist | undefined {
    return this.estadoVista?.tareas.find(t => t.id === this.tareaSeleccionadaId);
  }

  get esVistaActual(): boolean {
    return this.estadoSeleccionadoVista === this.runtime?.estadoActual;
  }

  get esEditable(): boolean {
    return this.esVistaActual && !this.runtime?.archivado;
  }

  get checklistCompleto(): boolean {
    const tareas = this.estadoVista?.tareas ?? [];
    return tareas.length > 0 && tareas.every(t => t.estado !== 'EN_CURSO');
  }

  get opcionesAvance(): string[] {
    if (this.runtime?.estadoActual === 'FINALIZADO') return [];

    const definicion = this.flujo.find(e => e.nombre === this.runtime?.estadoActual);
    const siguientes = definicion?.siguientes ?? [];

    return siguientes.includes('FINALIZADO') ? siguientes : [...siguientes, 'FINALIZADO'];
  }

  /** True si el expediente ya transitó por este estado (hay datos cargados para mostrar). */
  estaVisitado(nombreEstado: string): boolean {
    return !!this.runtime?.historial.some(h => h.nombre === nombreEstado);
  }

  /** Navega la vista a un estado ya transitado (los futuros todavía no tienen datos que mostrar). */
  verEstado(nombre: string): void {
    if (!this.estaVisitado(nombre)) return;
    this.estadoSeleccionadoVista = nombre;
    this.tareaSeleccionadaId = null;
  }

  seleccionarTarea(tarea: TareaChecklist): void {
    this.tareaSeleccionadaId = this.tareaSeleccionadaId === tarea.id ? null : tarea.id;
  }

  onGuardarTarea(tareaId: string, payload: TareaChecklistPayload): void {
    this.estadosService.actualizarTarea(this.expedienteId, tareaId, {
      estado: payload.estado,
      observacion: payload.observacion,
      fechaVencimiento: payload.fechaVencimiento,
      enviarAgenda: payload.enviarAgenda,
    }).subscribe({
      next: () => this.subirArchivosTarea(tareaId, payload.archivosNuevos, payload.fechaVencimiento),
      error: () => toast.error('Error al actualizar la tarea'),
    });
  }

  /** Sube los archivos nuevos adjuntados en la tarea, asociándolos por tarea_id. */
  private subirArchivosTarea(tareaId: string, archivos: File[], fechaVencimiento?: string): void {
    if (!archivos.length) {
      toast.success('Tarea actualizada');
      this.cargarDatos();
      this.cdr.detectChanges();
      return;
    }

    const usuarioId = this.auth.currentUser()?.id ?? 1;

    const requests = archivos.map(archivo => {
      const fd = new FormData();
      fd.append('archivo', archivo);
      fd.append('expediente', String(this.expedienteId));
      fd.append('tarea', tareaId);
      fd.append('usuario_creacion', String(usuarioId));
      if (fechaVencimiento) {
        fd.append('fecha_documento', fechaVencimiento);
      }
      if (this.tipoDocumentoOtroId) {
        fd.append('tipo_documento', String(this.tipoDocumentoOtroId));
      }
      return this.http.post(`${environment.apiUrl}/subirDocumento`, fd);
    });

    forkJoin(requests).subscribe({
      next: () => {
        toast.success('Tarea actualizada');
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: () => {
        toast.error('La tarea se actualizó pero hubo un error al subir uno o más documentos');
        this.cargarDatos();
        this.cdr.detectChanges();
      },
    });
  }

  avanzarA(siguienteEstado: string): void {
    const estadoActual = this.flujo.find(e => e.nombre === this.runtime?.estadoActual);
    // necesitamos el id numérico — lo buscamos desde los datos del expediente
    const estadoActualId = this.expediente?.estado?.id ?? 0;

    this.estadosService.avanzarEstado(this.expedienteId, siguienteEstado, estadoActualId).subscribe({
      next: () => {
        toast.success(`Expediente avanzado a "${siguienteEstado}"`);
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err) => toast.error(err?.error?.detalle ?? err?.error?.mensaje ?? 'Error al avanzar de estado'),
    });
  }

  modalAvanceOpen = false;

  cerrarModalAvance(): void {
    this.modalAvanceOpen = false;
  }

  avanzarYCerrar(opcion: string): void {
    this.avanzarA(opcion);
    this.modalAvanceOpen = false;
  }

  /** Retorna a la página de gestión de expedientes. */
  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}