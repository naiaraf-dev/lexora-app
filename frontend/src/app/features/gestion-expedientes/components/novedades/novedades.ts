import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovedadesFilter, NovedadFilterState } from '../novedades-filter/novedades-filter';
import { NovedadesCard, Novedad } from '../novedades-card/novedades-card';
import { ModalNovedad } from '../modal-novedad/modal-novedad';
import { toast } from 'ngx-sonner';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { Router } from '@angular/router';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, NovedadesFilter, NovedadesCard, ModalNovedad, PrimaryBtn],
  templateUrl: './novedades.html',
})
export class Novedades {
  private router = inject(Router);

  // 🔴 MOCK — reemplazar por servicio
  allNovedades: Novedad[] = [
    {
      id: '3',
      tipo: 'PRESENTACION', tipoLabel: 'Presentación',
      fechaActuacion: '2023-03-12T00:00:00',
      titulo: 'Se presenta demanda',
      descripcion: 'Se presenta demanda por daños y perjuicios ante el Juzgado Civil N 32. Se adjunta documentación respaldatoria.',
      responsable: 'Dra. Martínez',
      archivos: [
        { nombre: 'demanda inicial.pdf', url: '#' },
        { nombre: 'contrato de locación.pdf', url: '#' },
      ],
      tarea: undefined,
    },
    {
      id: '2',
      tipo: 'AUDIENCIA', tipoLabel: 'Audiencia',
      fechaActuacion: '2023-09-20T00:00:00',
      titulo: 'Audiencia de conciliacion',
      descripcion: 'Se celebra audiencia de conciliación ante el juez. Las partes no llegan a un acuerdo. Se fija audiencia de prueba.',
      responsable: 'Dra. Morales',
      archivos: [],
      tarea: {
        id: 't1',
        titulo: 'Preparar alegato para audiencia de prueba',
        prioridad: 'MEDIA',
        fechaVencimiento: '2023-10-10',
        responsable: 'Dra. Morales',
        descripcionInstrucciones: '',
        cumplida: false,
        // agendaEventId: undefined, // 🗓️ AGENDA — a poblar cuando se conecte la agenda
      },
    },
    {
      id: '1',
      tipo: 'RESOLUCION', tipoLabel: 'Resolución',
      fechaActuacion: '2024-11-10T00:00:00',
      titulo: 'Resolución interlocutoria',
      descripcion: 'El juzgado resuelve hacer lugar a la prueba ofrecida por la parte actora. Se fija plazo de 10 dias para producción de prueba.',
      responsable: 'Dra. Martínez',
      archivos: [{ nombre: 'resolución interlocutoria.pdf', url: '#' }],
      tarea: {
        id: 't2',
        titulo: 'Producir prueba en 10 dias',
        prioridad: 'ALTA',
        fechaVencimiento: '2024-11-20',
        responsable: 'Dra. Martínez',
        descripcionInstrucciones: '',
        cumplida: false,
        // agendaEventId: undefined, // 🗓️ AGENDA — a poblar cuando se conecte la agenda
      },
    },
  ];

  filteredNovedades: Novedad[] = [...this.allNovedades];

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

  onEliminar(novedad: Novedad) {
    this.allNovedades = this.allNovedades.filter(n => n.id !== novedad.id);
    this.filteredNovedades = this.filteredNovedades.filter(n => n.id !== novedad.id);
    toast.success('Novedad eliminada');
  }

  onGuardar(payload: Partial<Novedad>) {
    if (this.novedadEditando) {
      // Edición
      this.allNovedades = this.allNovedades.map(n =>
        n.id === this.novedadEditando!.id ? { ...n, ...payload } : n
      );
      toast.success('Novedad actualizada correctamente');
    } else {
      // Alta
      const nueva: Novedad = {
        id: crypto.randomUUID(),
        tipoLabel: payload.tipo ?? '',
        responsable: 'Usuario actual', // 🔴 MOCK — reemplazar por usuario logueado
        archivos: [],
        ...payload,
      } as Novedad;
      this.allNovedades = [nueva, ...this.allNovedades];
      toast.success('Novedad creada correctamente');
    }
    this.filteredNovedades = [...this.allNovedades];
    this.modalOpen = false;
    this.novedadEditando = null;
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}