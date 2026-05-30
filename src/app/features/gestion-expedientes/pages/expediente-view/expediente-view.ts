import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCard } from '../../../../shared/components/info-card/info-card';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { Router } from '@angular/router';

interface Campo {
  iconPath: string;
  label: string;
  value: string;
  full?: boolean;
}

interface Documento {
  nombre: string;
  meta: string;
}

interface Tarea {
  titulo: string;
  vencimiento: string;
  estado: 'Cumplida' | 'Pendiente';
}

interface Novedad {
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

// Íconos (heroicons outline)
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
  hash: 'M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5',
  target: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
};

@Component({
  selector: 'app-expediente-view',
  standalone: true,
  imports: [CommonModule, InfoCard, PrimaryBtn],
  templateUrl: './expediente-view.html',
})
export class ExpedienteView {
  private router = inject(Router);
  
  // ---- Resumen ----
  resumen = {
    estado: 'En trámite',
    proximoVencimiento: '20/12/2024',
    cumplidas: 1,
    pendientes: 2,
    vencidas: 0,
  };

  // ---- Datos Generales ----
  datosGenerales: Campo[] = [
    { iconPath: ICON.doc, label: 'N° de Expediente', value: '1245/2023' },
    { iconPath: ICON.building, label: 'Área', value: 'Civil' },
    { iconPath: ICON.doc, label: 'Tipo de expediente', value: 'Demanda' },
    { iconPath: ICON.doc, label: 'Carátula', value: 'Pérez Juan c/ López María s/ daños y perjuicios' },
    { iconPath: ICON.user, label: 'Cliente', value: 'Juan Perez' },
    { iconPath: ICON.tag, label: 'Rol del Cliente', value: 'Denunciante' },
    { iconPath: ICON.flag, label: 'Estado', value: 'En trámite' },
    {
      iconPath: ICON.doc,
      label: 'Descripción / Objeto del expediente',
      value:
        'Demanda por daños y perjuicios derivados de accidente de transito ocurrido el 15/01/2023 en Av. Corrientes y Callao.',
      full: true,
    },
  ];

  // ---- Datos Judiciales ----
  datosJudiciales: Campo[] = [
    { iconPath: ICON.building, label: 'Fuero', value: 'Fuero Federal' },
    { iconPath: ICON.scale, label: 'Juzgado', value: 'Juzgado Civil N 32' },
    { iconPath: ICON.book, label: 'Secretaría', value: '-' },
    { iconPath: ICON.mapPin, label: 'Jurisdicción', value: 'C.A.B.A.' },
    { iconPath: ICON.doc, label: 'N° de causa PJN', value: '1245/2023' },
    { iconPath: ICON.layers, label: 'Instancia', value: 'Primera instancia' },
  ];

  // ---- Profesionales ----
  profesionales: Campo[] = [
    { iconPath: ICON.user, label: 'Abogado responsable', value: '-' },
    { iconPath: ICON.user, label: 'Abogado secundario', value: '-' },
    { iconPath: ICON.building, label: 'Estudio / Sede', value: '-' },
    { iconPath: ICON.user, label: 'Contraparte', value: '-' },
    { iconPath: ICON.user, label: 'Abogado contraparte', value: '-' },
  ];

  // ---- Fechas Claves ----
  fechasClaves: Campo[] = [
    { iconPath: ICON.calendar, label: 'Fecha de inicio', value: '-' },
    { iconPath: ICON.calendar, label: 'Fecha de última actuación', value: '-' },
    { iconPath: ICON.clock, label: 'Fecha procesal próximo', value: '-' },
  ];

  // ---- Clasificación Interna ----
  clasificacion: Campo[] = [
    { iconPath: ICON.flag, label: 'Prioridad', value: '-' },
    { iconPath: ICON.tag, label: 'Etiqueta / Categoría', value: '-' },
    { iconPath: ICON.target, label: 'Origen del caso', value: '-' },
  ];

  // ---- Documentos ----
  documentos: Documento[] = [
    { nombre: 'Demanda inicial.pdf', meta: 'Escrito - 15/06/2025 - Dr. Pérez' },
    { nombre: 'Contrato locación.pdf', meta: 'Contrato - 06/01/2026 - Dra. Morales' },
    { nombre: 'Resolución interlocutoria.pdf', meta: 'Oficio - 23/12/2025 - Dra. Martinez' },
  ];

  // ---- Historial de Novedades ----
  novedades: Novedad[] = [
    {
      tipo: 'Presentacion',
      badgeClasses: 'bg-blue-50 text-blue-600',
      dotClasses: 'border-blue-400',
      fecha: '12/03/2023',
      autor: 'Dra. Martinez',
      titulo: 'Se presenta demanda',
      descripcion:
        'Se presenta demanda por danos y perjuicios ante el Juzgado Civil N 32. Se adjunta documentacion respaldatoria.',
      adjuntos: ['demanda inicial.pdf', 'contrato de locacion.pdf'],
    },
    {
      tipo: 'Audiencia',
      badgeClasses: 'bg-amber-50 text-amber-600',
      dotClasses: 'border-amber-400',
      fecha: '20/09/2023',
      autor: 'Dra. Morales',
      titulo: 'Audiencia de conciliacion',
      descripcion:
        'Se celebra audiencia de conciliacion ante el juez. Las partes no llegan a un acuerdo. Se fija audiencia de prueba.',
      adjuntos: [],
      tarea: {
        titulo: 'Preparar alegato para audiencia de prueba',
        vencimiento: '30/09/2023',
        estado: 'Cumplida',
      },
    },
    {
      tipo: 'Resolucion',
      badgeClasses: 'bg-red-50 text-red-600',
      dotClasses: 'border-red-400',
      fecha: '10/11/2024',
      autor: 'Dra. Martinez',
      titulo: 'Resolucion interlocutoria',
      descripcion:
        'El juzgado resuelve hacer lugar a la prueba ofrecida por la parte actora. Se fija plazo de 10 dias para produccion de prueba.',
      adjuntos: ['resolucion interlocutoria.pdf'],
      tarea: {
        titulo: 'Producir prueba en 10 dias',
        vencimiento: '20/11/2024',
        estado: 'Pendiente',
      },
    },
  ];

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }
}