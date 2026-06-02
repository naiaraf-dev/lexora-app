import { Injectable, signal, computed } from '@angular/core';
import { Novedad } from '../components/novedades-card/novedades-card';
import { Documento } from '../components/documentos-table/documentos-table';

@Injectable({ providedIn: 'root' })
export class ExpedienteStore {

  // ── Novedades ──────────────────────────────────────────────────────────────
  private _novedades = signal<Novedad[]>([
    // 🔴 MOCK — reemplazar por: this.expedienteService.getNovedades(expedienteId)
    // El signal se inicializa vacío y se carga en ngOnInit del componente o con un efecto
    {
      id: '3',
      tipo: 'PRESENTACION', tipoLabel: 'Presentación',
      fechaActuacion: '2023-03-12T00:00:00',
      titulo: 'Se presenta demanda',
      descripcion: 'Se presenta demanda por daños y perjuicios ante el Juzgado Civil N 32.',
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
      descripcion: 'Se celebra audiencia de conciliación ante el juez. Las partes no llegan a un acuerdo.',
      responsable: 'Dra. Morales',
      archivos: [],
      tarea: {
        id: 't1', titulo: 'Preparar alegato para audiencia de prueba',
        prioridad: 'MEDIA', fechaVencimiento: '2023-10-10',
        responsable: 'Dra. Morales', descripcionInstrucciones: '', cumplida: false,
      },
    },
    {
      id: '1',
      tipo: 'RESOLUCION', tipoLabel: 'Resolución',
      fechaActuacion: '2024-11-10T00:00:00',
      titulo: 'Resolución interlocutoria',
      descripcion: 'El juzgado resuelve hacer lugar a la prueba ofrecida por la parte actora.',
      responsable: 'Dra. Martínez',
      archivos: [{ nombre: 'resolución interlocutoria.pdf', url: '#' }],
      tarea: {
        id: 't2', titulo: 'Producir prueba en 10 dias',
        prioridad: 'ALTA', fechaVencimiento: '2024-11-20',
        responsable: 'Dra. Martínez', descripcionInstrucciones: '', cumplida: false,
      },
    },
  ]);

  readonly novedades = this._novedades.asReadonly();

  // Opciones para el select "Relacionado con" en documentos
  readonly novedadesComoOpciones = computed(() =>
    this._novedades().map(n => ({
      value: n.id,
      label: `Novedad: ${n.titulo}`,
    }))
  );

  agregarNovedad(novedad: Novedad): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.createNovedad(novedad).subscribe(...)
    // El back devuelve la novedad creada con su id real y también crea los documentos vinculados
    // El frontend solo hace: this._novedades.update(...) con la respuesta del back, sin generar ids ni mockear documentos
    this._novedades.update(list => [novedad, ...list]);
    // Si tiene archivos adjuntos, los sincronizamos como documentos
    if (novedad.archivos.length > 0) {
      // 🔴 MOCK — esta sincronización la hace el back automáticamente al crear la novedad
      // El back crea los documentos vinculados y los devuelve; acá solo se refresca _documentos
      // con la respuesta: this._documentos.set(await getDocumentos(expedienteId))
      const docs: Documento[] = novedad.archivos.map(a => ({
        id:             crypto.randomUUID(),
        nombre:         a.nombre,
        tipo:           'OTRO',
        tipoLabel:      'Otro',
        relacionadoCon: `Novedad: ${novedad.titulo}`,
        relacionadoId:  novedad.id,   // 🗓️ AGENDA — también sirve para linkear con el evento
        fechaCarga:     new Date().toISOString(),
        tamanio:        '—',
        descripcion:    '',
        fechaDocumento: novedad.fechaActuacion.split('T')[0],
        url:            a.url,
      }));
      this._documentos.update(list => [...docs, ...list]);
    }
  }

  actualizarNovedad(id: string, cambios: Partial<Novedad>): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.updateNovedad(id, cambios).subscribe(...)
    this._novedades.update(list =>
      list.map(n => n.id === id ? { ...n, ...cambios } : n)
    );
    // Si cambió el título, actualizar "relacionadoCon" en los documentos vinculados
    if (cambios.titulo) {
      // 🔴 MOCK — el back actualiza relacionadoCon en cascada; acá solo se refresca _documentos
      this._documentos.update(list =>
        list.map(d =>
          d.relacionadoId === id
            ? { ...d, relacionadoCon: `Novedad: ${cambios.titulo}` }
            : d
        )
      );
    }
  }

  eliminarNovedad(id: string): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.deleteNovedad(id).subscribe(...)
    this._novedades.update(list => list.filter(n => n.id !== id));
  }

  // ── Documentos ─────────────────────────────────────────────────────────────
  private _documentos = signal<Documento[]>([
    // 🔴 MOCK — reemplazar por: this.expedienteService.getDocumentos(expedienteId)
    { id: '1', nombre: 'Demanda inicial.pdf',   tipo: 'ESCRITO',  tipoLabel: 'Escrito',  relacionadoCon: 'Novedad: Presentación de prueba',   relacionadoId: '3', fechaCarga: '2025-06-15T00:00:00', tamanio: '3.4 MB',  descripcion: '', fechaDocumento: '2025-06-01', url: '#' },
    { id: '2', nombre: 'Contrato_locacion.pdf', tipo: 'CONTRATO', tipoLabel: 'Contrato', relacionadoCon: '',                                  relacionadoId: '',  fechaCarga: '2026-01-06T00:00:00', tamanio: '156 KB', descripcion: '', fechaDocumento: '2026-01-05', url: '#' },
    { id: '3', nombre: 'Demanda inicial.pdf',   tipo: 'OFICIO',   tipoLabel: 'Oficio',   relacionadoCon: 'Novedad: Oficio recibido',          relacionadoId: '',  fechaCarga: '2025-12-23T00:00:00', tamanio: '245 KB', descripcion: '', fechaDocumento: '2025-12-20', url: '#' },
  ]);

  readonly documentos = this._documentos.asReadonly();

  agregarDocumento(doc: Documento): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.createDocumento(doc).subscribe(...)
    this._documentos.update(list => [doc, ...list]);
  }

  actualizarDocumento(id: string, cambios: Partial<Documento>): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.updateDocumento(id, cambios).subscribe(...)
    this._documentos.update(list =>
      list.map(d => d.id === id ? { ...d, ...cambios } : d)
    );
  }

  eliminarDocumento(id: string): void {
    // 🔴 MOCK — reemplazar por: this.expedienteService.deleteDocumento(id).subscribe(...)
    this._documentos.update(list => list.filter(d => d.id !== id));
  }
}