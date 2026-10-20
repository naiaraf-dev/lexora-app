import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Acreditacion, DocumentoRef, EstadoLiquidacion, EstadoPrevision, EventoHistorial, FacturaHonorarios, Impulso,
  Intimacion, Liquidacion, LiquidacionListado, ModoPrevision, NuevaLiquidacion, NuevaPrevision, Obligado, Pago,
  PagoListado, PrevisionDetalle, PrevisionFiltros, PrevisionItem, PrevisionListado, PrevisionResumen, Prorrateo,
  TasaVigente,
} from '../models/prevision.model';
import { UiSelectOption } from '../../../shared/components/ui-select/ui-select';

/** Fila de un catálogo de /api/enums/:nombre. */
interface ItemCatalogo {
  id: number;
  nombre: string;
}

/** Catálogos que usa el módulo. tasa trae los nombres del CPACF (los mismos de tasas-config.ts). */
type NombreCatalogo = 'estadoprevision' | 'tipoobligacion' | 'conceptoprevision' | 'estadoliquidacion' | 'mediopago' | 'tasa';

/**
 * Service del módulo Previsión y pago: el único punto de contacto con /api/previsiones.
 *
 * El back trabaja con snake_case, ids y objetos { id, nombre }; los componentes, con camelCase y nombres
 * (BADGE_ESTADO, ACCIONES, selects). Este service traduce en los dos sentidos, igual que ClienteService:
 * mapFromBackend al recibir y mapToBackend al enviar. Para pasar de nombre a id usa los catálogos de
 * /api/enums, que se piden una sola vez y quedan en memoria.
 */
@Injectable({ providedIn: 'root' })
export class PrevisionService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/previsiones`;
  private catalogos = new Map<NombreCatalogo, Observable<ItemCatalogo[]>>();

  // ---------- Lecturas ----------

  /** GET /api/previsiones (paginado; las tarjetas vienen en resumen) */
  listar(filtros: PrevisionFiltros = {}): Observable<PrevisionListado> {
    return forkJoin({ estados: this.catalogo('estadoprevision'), tipos: this.catalogo('tipoobligacion') }).pipe(
      switchMap(({ estados, tipos }) => {
        let params = new HttpParams()
          .set('pagina', filtros.pagina ?? 1)
          .set('pageSize', filtros.pageSize ?? 25);
        if (filtros.expediente?.trim()) params = params.set('expediente', filtros.expediente.trim());
        if (filtros.cliente?.trim()) params = params.set('cliente', filtros.cliente.trim());
        if (filtros.estado) params = params.set('estado', this.idDe(estados, filtros.estado, 'estado'));
        if (filtros.tipoObligacion) params = params.set('tipoObligacion', this.idDe(tipos, filtros.tipoObligacion, 'tipo de obligación'));
        if (filtros.modo) params = params.set('modo', filtros.modo.toLowerCase());
        if (filtros.expedienteId) params = params.set('expedienteId', filtros.expedienteId);
        return this.http.get<any>(this.base, { params });
      }),
      map(res => ({
        data: (res.data ?? []).map((p: any) => this.mapResumen(p)),
        total: res.total ?? 0,
        pagina: res.pagina ?? 1,
        pageSize: res.pageSize ?? 25,
        resumen: {
          activas: res.resumen?.activas ?? 0,
          totalPrevisto: this.num(res.resumen?.totalPrevisto) ?? 0,
          pendientesPago: res.resumen?.pendientesPago ?? 0,
          pagadas: res.resumen?.pagadas ?? 0,
        },
      })),
    );
  }

  /** GET /api/previsiones?expedienteId=:id (en una causa, el back devuelve las del principal) */
  listarPorExpediente(expedienteId: number): Observable<PrevisionResumen[]> {
    return this.listar({ expedienteId, pageSize: 100 }).pipe(map(r => r.data));
  }

  /** GET /api/previsiones/:id */
  obtener(id: number): Observable<PrevisionDetalle> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(p => this.mapDetalle(p)));
  }

  /** GET /api/previsiones/liquidaciones (pestaña global) */
  listarLiquidaciones(): Observable<LiquidacionListado[]> {
    return this.http.get<any[]>(`${this.base}/liquidaciones`).pipe(
      map(filas => filas.map(l => ({ ...this.mapLiquidacion(l), ...this.mapContexto(l) }))),
    );
  }

  /** GET /api/previsiones/pagos (pestaña global) */
  listarPagos(): Observable<PagoListado[]> {
    return this.http.get<any[]>(`${this.base}/pagos`).pipe(
      map(filas => filas.map(x => ({ ...this.mapPago(x), ...this.mapContexto(x) }))),
    );
  }

  /** GET /api/enums/:nombre → opciones por nombre, en el orden de los ids (el de las constantes del back). */
  obtenerCatalogo(nombre: string): Observable<UiSelectOption[]> {
    return this.catalogo(nombre as NombreCatalogo).pipe(
      map(items => items.map(i => ({ value: i.nombre, label: i.nombre }))),
    );
  }

  /**
   * GET /api/tasa?nombre= — último valor publicado de la tasa en el CPACF.
   * Es solo una referencia que se guarda en tasa_valor: los intereses los ingresa el abogado.
   */
  obtenerTasaVigente(nombre: string): Observable<TasaVigente> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<any>(`${environment.apiUrl}/tasa`, { params }).pipe(
      map(t => ({ nombre, valor: this.num(t.valor), fechaPublicacion: this.fechaArgentinaAISO(t.fecha) })),
      // /api/tasa responde { error } en lugar de { mensaje }: se normaliza para los componentes.
      catchError(err => throwError(() => ({
        status: err?.status,
        error: { mensaje: err?.error?.mensaje ?? err?.error?.error ?? 'No se pudo consultar la tasa en el CPACF' },
      }))),
    );
  }

  /**
   * Trae el archivo con HttpClient (así viaja el token) y devuelve una URL local para verlo.
   * Quien la usa la libera con URL.revokeObjectURL al cerrar.
   */
  descargarDocumento(doc: DocumentoRef): Observable<{ nombre: string; url: string }> {
    return this.http.get(doc.url, { responseType: 'blob' }).pipe(
      map(blob => {
        // Cloudinary guarda los archivos como "raw": se reetiqueta el tipo para que el navegador los muestre.
        const tipo = /\.pdf$/i.test(doc.nombre) ? 'application/pdf'
          : /\.(png|jpe?g|gif|webp)$/i.test(doc.nombre) ? `image/${doc.nombre.split('.').pop()!.toLowerCase().replace('jpg', 'jpeg')}`
          : blob.type;
        return { nombre: doc.nombre, url: URL.createObjectURL(new Blob([blob], { type: tipo })) };
      }),
    );
  }

  // ---------- Escrituras (todas devuelven el detalle recalculado) ----------

  /** POST /api/previsiones */
  crear(body: NuevaPrevision): Observable<PrevisionDetalle> {
    return forkJoin({
      tipos: this.catalogo('tipoobligacion'),
      conceptos: this.catalogo('conceptoprevision'),
      tasas: this.catalogo('tasa'),
    }).pipe(
      switchMap(c => this.http.post<any>(this.base, {
        expediente: body.expedienteId,
        tipo_obligacion: this.idDe(c.tipos, body.tipoObligacion, 'tipo de obligación'),
        modo: body.modo.toLowerCase(),
        obligado: body.obligado.toLowerCase(),
        obligado_detalle: body.obligadoDetalle,
        fecha_resolucion: body.fechaResolucion,
        fecha_firmeza: body.fechaFirmeza,
        fecha_estimada_pago: body.fechaEstimadaPago,
        ejercicio: body.ejercicio,
        monto_base: body.montoBase,
        intereses_estimados: body.interesesEstimados,
        tasa: this.idDe(c.tasas, body.tasa, 'tasa'),
        tasa_valor: body.tasaValor,
        observaciones: body.observaciones,
        items: body.items.map(i => ({
          concepto_prevision: this.idDe(c.conceptos, i.concepto, 'concepto'),
          monto_base: i.monto,
          instancia: i.instancia ?? null,
          observaciones: i.observaciones ?? null,
        })),
      })),
      map(p => this.mapDetalle(p)),
    );
  }

  /** POST /api/previsiones/:id/registrar (fecha y monto previsto final, en la misma transacción) */
  registrarPrevision(id: number, datos: { fechaPrevisionado: string; montoPrevisto: number }): Observable<PrevisionDetalle> {
    return this.http.post<any>(`${this.base}/${id}/registrar`, {
      fecha_provisionado: datos.fechaPrevisionado,
      monto_previsto: datos.montoPrevisto || null,
    }).pipe(map(p => this.mapDetalle(p)));
  }

  /** POST /api/previsiones/:id/liquidaciones */
  crearLiquidacion(id: number, datos: NuevaLiquidacion): Observable<PrevisionDetalle> {
    return forkJoin({ tasas: this.catalogo('tasa'), estados: this.catalogo('estadoliquidacion') }).pipe(
      switchMap(c => this.http.post<any>(`${this.base}/${id}/liquidaciones`, {
        fecha_liquidacion: datos.fechaLiquidacion,
        fecha_desde: datos.fechaDesde,
        fecha_hasta: datos.fechaHasta,
        tasa: this.idDe(c.tasas, datos.tasa, 'tasa'),
        tasa_valor: datos.tasaValor,
        tasa_fecha_publicacion: datos.tasaFechaPublicacion,
        capital: datos.capital,
        intereses: datos.intereses,
        otros: datos.otros,
        total: datos.total,
        estado_liquidacion: this.idDe(c.estados, datos.estadoLiquidacion, 'estado de liquidación'),
        observaciones: datos.observaciones ?? null,
      })),
      map(p => this.mapDetalle(p)),
    );
  }

  /** PATCH /api/previsiones/:id/liquidaciones/:liqId */
  cambiarEstadoLiquidacion(id: number, liqId: number, estado: EstadoLiquidacion): Observable<PrevisionDetalle> {
    return this.catalogo('estadoliquidacion').pipe(
      switchMap(estados => this.http.patch<any>(`${this.base}/${id}/liquidaciones/${liqId}`, {
        estado_liquidacion: this.idDe(estados, estado, 'estado de liquidación'),
      })),
      map(p => this.mapDetalle(p)),
    );
  }

  /** PUT /api/previsiones/:id/prorrateo */
  guardarProrrateo(id: number, datos: Prorrateo): Observable<PrevisionDetalle> {
    return this.http.put<any>(`${this.base}/${id}/prorrateo`, {
      aprobado: datos.aprobado,
      verificado: datos.verificado,
      fecha_aprobacion: datos.fechaAprobacion,
      resolucion: datos.resolucion,
      base_calculo: datos.baseCalculo,
      honorarios_sujetos: datos.honorariosSujetos,
      coeficiente: datos.coeficiente,
      monto_prorrateado: datos.montoProrrateado,
    }).pipe(map(p => this.mapDetalle(p)));
  }

  /** PUT /api/previsiones/:id/factura (multipart con el archivo) */
  guardarFactura(id: number, datos: { profesional: string; monto: number; fecha: string }, archivo: File | null): Observable<PrevisionDetalle> {
    const fd = this.formData({ profesional: datos.profesional, monto: datos.monto, fecha: datos.fecha }, archivo);
    return this.http.put<any>(`${this.base}/${id}/factura`, fd).pipe(map(p => this.mapDetalle(p)));
  }

  /** POST /api/previsiones/:id/impulsos (multipart con la nota) */
  registrarImpulso(id: number, datos: { fecha: string; monto: number; observaciones?: string }, archivo: File | null): Observable<PrevisionDetalle> {
    const fd = this.formData({ fecha: datos.fecha, monto: datos.monto, observaciones: datos.observaciones }, archivo);
    return this.http.post<any>(`${this.base}/${id}/impulsos`, fd).pipe(map(p => this.mapDetalle(p)));
  }

  /** POST /api/previsiones/:id/pagos (multipart con el comprobante) */
  registrarPago(
    id: number,
    datos: { fechaPago: string; monto: number; pagador: Obligado; pagadorDetalle: string | null; medioPago: string; referencia: string | null; observaciones?: string },
    archivo: File | null,
  ): Observable<PrevisionDetalle> {
    return this.catalogo('mediopago').pipe(
      switchMap(medios => this.http.post<any>(`${this.base}/${id}/pagos`, this.formData({
        fecha_pago: datos.fechaPago,
        monto: datos.monto,
        pagador: datos.pagador,
        pagador_detalle: datos.pagadorDetalle,
        medio_pago: this.idDe(medios, datos.medioPago, 'medio de pago'),
        referencia: datos.referencia,
        observaciones: datos.observaciones,
      }, archivo))),
      map(p => this.mapDetalle(p)),
    );
  }

  /** POST /api/previsiones/:id/acreditaciones (multipart con el proveído) */
  registrarAcreditacion(id: number, datos: { fecha: string; ordenaNotificar: boolean }, archivo: File | null): Observable<PrevisionDetalle> {
    const fd = this.formData({ fecha: datos.fecha, ordena_notificar: String(datos.ordenaNotificar) }, archivo);
    return this.http.post<any>(`${this.base}/${id}/acreditaciones`, fd).pipe(map(p => this.mapDetalle(p)));
  }

  /** POST /api/previsiones/:id/intimaciones (multipart con la cédula o el proveído) */
  registrarIntimacion(
    id: number,
    datos: { fecha: string; fechaVencimiento: string; apercibimiento: string | null; observaciones?: string },
    archivo: File | null,
  ): Observable<PrevisionDetalle> {
    const fd = this.formData({
      fecha: datos.fecha,
      fecha_vencimiento: datos.fechaVencimiento,
      apercibimiento: datos.apercibimiento,
      observaciones: datos.observaciones,
    }, archivo);
    return this.http.post<any>(`${this.base}/${id}/intimaciones`, fd).pipe(map(p => this.mapDetalle(p)));
  }

  /** POST /api/previsiones/:id/cerrar */
  cerrar(id: number): Observable<PrevisionDetalle> {
    return this.http.post<any>(`${this.base}/${id}/cerrar`, {}).pipe(map(p => this.mapDetalle(p)));
  }

  /** DELETE /api/previsiones/:id/pagos/:pagoId — anula el pago (activo = 0) y recalcula el estado */
  anularPago(id: number, pagoId: number): Observable<PrevisionDetalle> {
    return this.http.delete<any>(`${this.base}/${id}/pagos/${pagoId}`).pipe(map(p => this.mapDetalle(p)));
  }

  /** DELETE /api/previsiones/:id/liquidaciones/:liqId — anula la liquidación; si era la vigente, vuelve la anterior */
  anularLiquidacion(id: number, liqId: number): Observable<PrevisionDetalle> {
    return this.http.delete<any>(`${this.base}/${id}/liquidaciones/${liqId}`).pipe(map(p => this.mapDetalle(p)));
  }

  /** PATCH /api/previsiones/:id/modo */
  cambiarModo(id: number, modo: ModoPrevision): Observable<PrevisionDetalle> {
    return this.http.patch<any>(`${this.base}/${id}/modo`, { modo: modo.toLowerCase() })
      .pipe(map(p => this.mapDetalle(p)));
  }

  // ---------- Mapeo BD → modelo frontend ----------

  private mapResumen(p: any): PrevisionResumen {
    return {
      id: p.id,
      expedienteId: p.expediente,
      expedienteNumero: p.numeroExpediente,            // EXP-año-id, igual que numeroInterno de expedientes
      caratula: p.caratula ?? '',
      cliente: p.cliente?.nombre ?? '',
      tipoObligacion: p.tipoObligacion?.nombre ?? '',
      obligado: String(p.obligado ?? '').toUpperCase() as Obligado,   // en la BD va en minúscula
      obligadoNombre: p.obligadoNombre ?? '',
      modo: String(p.modo ?? '').toUpperCase() as ModoPrevision,
      estado: p.estado?.nombre as EstadoPrevision,
      fechaResolucion: this.fecha(p.fecha_resolucion),
      montoBase: this.num(p.monto_base) ?? 0,
      montoPrevisto: this.num(p.monto_previsto) ?? 0,
      totalLiquidacionVigente: this.num(p.totalLiquidacionVigente),
      totalPagado: this.num(p.totalPagado) ?? 0,
      saldo: this.num(p.saldo),
    };
  }

  private mapDetalle(p: any): PrevisionDetalle {
    return {
      ...this.mapResumen(p),
      area: p.expedienteArea ?? '',
      tipoExpediente: p.tipoExpedienteNombre ?? '',
      fuero: p.expedienteFuero ?? null,
      obligadoDetalle: p.obligado_detalle ?? null,
      fechaFirmeza: this.fecha(p.fecha_firmeza),
      fechaEstimadaPago: this.fecha(p.fecha_estimada_pago),
      ejercicio: p.ejercicio ?? null,
      tasa: p.tasaInfo?.nombre ?? null,
      tasaValor: this.num(p.tasa_valor),
      interesesEstimados: this.num(p.intereses_estimados),
      fechaPrevisionado: this.fecha(p.fecha_provisionado),
      observaciones: p.observaciones ?? null,
      items: (p.items ?? []).map((i: any) => this.mapItem(i)),
      liquidaciones: (p.liquidaciones ?? []).map((l: any) => this.mapLiquidacion(l)),
      impulsos: (p.impulsos ?? []).map((i: any) => this.mapImpulso(i)),
      pagos: (p.pagos ?? []).map((x: any) => this.mapPago(x)),
      acreditaciones: (p.acreditaciones ?? []).map((a: any) => this.mapAcreditacion(a)),
      intimaciones: (p.intimaciones ?? []).map((i: any) => this.mapIntimacion(i)),
      prorrateo: p.prorrateo ? this.mapProrrateo(p.prorrateo) : null,
      factura: p.factura ? this.mapFactura(p.factura) : null,
      historial: (p.historial ?? []).map((h: any) => this.mapEvento(h)),
      // Marcas y alertas las calcula el back (sección 6): llegan listas para mostrar.
      marcas: p.marcas ?? [],
      alertas: p.alertas ?? [],
    };
  }

  private mapAcreditacion(a: any): Acreditacion {
    return {
      id: a.id,
      fecha: this.fecha(a.fecha) ?? '',
      documento: this.documento(a.documento, a.documentoNombre),
      ordenaNotificar: !!a.ordena_notificar,
      tareaId: a.tarea ?? null,
      notificacionCumplida: a.tareaEstado === 2,   // estado_tarea 2 = Cumplido
    };
  }

  private mapIntimacion(i: any): Intimacion {
    return {
      id: i.id,
      fecha: this.fecha(i.fecha) ?? '',
      fechaVencimiento: this.fecha(i.fecha_vencimiento) ?? '',
      apercibimiento: i.apercibimiento ?? null,
      documento: this.documento(i.documento, i.documentoNombre),
      tareaId: i.tarea ?? null,
      observaciones: i.observaciones ?? null,
    };
  }

  private mapProrrateo(x: any): Prorrateo {
    return {
      aprobado: !!x.aprobado,
      verificado: !!x.verificado,
      fechaAprobacion: this.fecha(x.fecha_aprobacion),
      resolucion: x.resolucion ?? null,
      baseCalculo: this.num(x.base_calculo),
      honorariosSujetos: this.num(x.honorarios_sujetos),
      coeficiente: this.num(x.coeficiente),
      montoProrrateado: this.num(x.monto_prorrateado),
    };
  }

  private mapFactura(f: any): FacturaHonorarios {
    return {
      profesional: f.profesional ?? '',
      monto: this.num(f.monto) ?? 0,
      fecha: this.fecha(f.fecha) ?? '',
      documento: this.documento(f.documento, f.documentoNombre),
    };
  }

  private mapEvento(h: any): EventoHistorial {
    return {
      fecha: this.fecha(h.fecha) ?? '',
      usuario: h.usuarioNombre ?? '',
      accion: h.accion,
      detalle: h.detalle ?? undefined,
    };
  }

  private mapItem(i: any): PrevisionItem {
    return {
      id: i.id,
      concepto: i.conceptoNombre ?? '',
      monto: this.num(i.monto_base) ?? 0,
      instancia: i.instancia ?? null,
      observaciones: i.observaciones ?? null,
    };
  }

  private mapLiquidacion(l: any): Liquidacion {
    return {
      id: l.id,
      numero: l.numero,
      fechaLiquidacion: this.fecha(l.fecha_liquidacion) ?? '',
      fechaDesde: this.fecha(l.fecha_desde) ?? '',
      fechaHasta: this.fecha(l.fecha_hasta) ?? '',
      tasa: l.tasaNombre ?? '',
      tasaValor: this.num(l.tasa_valor),
      capital: this.num(l.capital) ?? 0,
      intereses: this.num(l.intereses) ?? 0,
      otros: this.num(l.otros) ?? 0,
      total: this.num(l.total) ?? 0,
      estadoLiquidacion: l.estadoNombre as EstadoLiquidacion,
      vigente: !!l.vigente,
      observaciones: l.observaciones ?? null,
    };
  }

  private mapImpulso(i: any): Impulso {
    return {
      id: i.id,
      fecha: this.fecha(i.fecha) ?? '',
      monto: this.num(i.monto) ?? 0,
      esDiferencia: !!i.es_diferencia,
      documento: this.documento(i.documento, i.documentoNombre),
      observaciones: i.observaciones ?? null,
    };
  }

  private mapPago(x: any): Pago {
    return {
      id: x.id,
      fechaPago: this.fecha(x.fecha_pago) ?? '',
      monto: this.num(x.monto) ?? 0,
      pagador: x.pagador as Obligado,
      pagadorDetalle: x.pagador_detalle ?? null,
      medioPago: x.medioPagoNombre ?? '',
      referencia: x.referencia ?? null,
      documento: this.documento(x.documento, x.documentoNombre),
      observaciones: x.observaciones ?? null,
    };
  }

  /** Datos de la previsión que acompañan a cada fila de las pestañas globales. */
  private mapContexto(x: any) {
    return { previsionId: x.previsionId, expedienteNumero: x.expedienteNumero, cliente: x.cliente ?? '' };
  }

  /** Los archivos son documentos del expediente: se descargan con el endpoint de Documentos. */
  private documento(id: number | null, nombre: string | null): DocumentoRef | null {
    return id ? { id, nombre: nombre ?? 'documento', url: `${environment.apiUrl}/documento/${id}/descargar` } : null;
  }

  // ---------- Helpers ----------

  /** Catálogo cacheado y ordenado por id: en estados el orden es el del flujo. */
  private catalogo(nombre: NombreCatalogo): Observable<ItemCatalogo[]> {
    let cat = this.catalogos.get(nombre);
    if (!cat) {
      cat = this.http.get<ItemCatalogo[]>(`${environment.apiUrl}/enums/${nombre}`).pipe(
        map(items => [...items].sort((a, b) => a.id - b.id)),
        // Si falla, se descarta para que el próximo pedido vuelva a intentar.
        catchError(err => { this.catalogos.delete(nombre); return throwError(() => err); }),
        shareReplay(1),
      );
      this.catalogos.set(nombre, cat);
    }
    return cat;
  }

  /** Nombre → id. Si no está en el catálogo corta con el mismo formato de error que el back. */
  private idDe(items: ItemCatalogo[], nombre: string, que: string): number {
    const item = items.find(i => i.nombre === nombre);
    if (!item) throw { status: 400, error: { mensaje: `"${nombre}" no es un ${que} válido` } };
    return item.id;
  }

  /** multipart/form-data con los campos del body y el archivo en el campo "archivo". */
  private formData(campos: Record<string, string | number | null | undefined>, archivo: File | null): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    }
    if (archivo) fd.append('archivo', archivo);
    return fd;
  }

  /** DECIMAL llega como número; null queda null. */
  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /** Las columnas DATE llegan como ISO ("2026-06-10T00:00:00.000Z"): el front usa YYYY-MM-DD. */
  private fecha(v: unknown): string | null {
    return v ? String(v).slice(0, 10) : null;
  }

  /** El CPACF publica las fechas como dd/mm/aaaa. */
  private fechaArgentinaAISO(v: unknown): string | null {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v ?? '').trim());
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : null;
  }
}
