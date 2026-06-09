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
    console.log('cargando novedades para expediente:', this.expedienteId);
      this.http.get<any[]>(`${environment.apiUrl}/expedientes/${this.expedienteId}/novedades`)
          .subscribe({
              next: (res) => {
                console.log('novedades recibidas:', res);
                  this.allNovedades = res.map(n => ({
                      id:             String(n.id),
                      tipo:           n.tipoNovedad ? String(n.tipoNovedad.id) : '', 
                      tipoLabel:      n.tipoNovedad?.nombre ?? 'Observación',
                      fechaActuacion: n.fecha,
                      titulo:         n.titulo,
                      descripcion:    n.descripcion ?? '',
                      responsable:    n.usuarioCreacion?.nombre ?? '—',
                      // TODO: mapear archivos cuando se implemente endpoint correspondiente en el backend.
                      archivos: (n.archivos ?? []).map((a: any) => ({
                        nombre: a.nombre,
                        url:    a.url ?? '#',
                      })),
                      // TODO: mapear tarea asociada cuando se implemente endpoint correspondiente en el backend
                      tarea:          undefined,
                  }));
                  this.filteredNovedades = [...this.allNovedades];
                  this.cdr.detectChanges();
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
  }

  allNovedades: Novedad[] = [];
  filteredNovedades: Novedad[] = [];

  tipoNovedadOptions: { value: string; label: string }[] = [];
  prioridadOptions:   { value: string; label: string }[] = [];

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
        next: () => {
          this.cargarNovedades();
          this.modalOpen = false;
          this.novedadEditando = null;
          toast.success('Novedad actualizada correctamente');
        }
      });
    } else {
      this.http.post(`${environment.apiUrl}/novedades`, {
        expediente:       this.expedienteId,
        titulo:           payload.titulo,
        descripcion:      payload.descripcion,
        fecha_novedad:    payload.fechaActuacion,
        es_procesal:      false,
        tipo_novedad:     payload.tipo ? Number(payload.tipo) : null,
        usuario_creacion: 1,
      }).subscribe({
        next: () => {
          this.cargarNovedades();
          this.modalOpen = false;
          this.novedadEditando = null;
          toast.success('Novedad creada correctamente');
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  get mensajeConfirmar(): string {
    return `¿Estás seguro que querés eliminar la novedad "${this.novedadAEliminar?.titulo ?? ''}"? Esta acción no se puede deshacer.`;
  }
}