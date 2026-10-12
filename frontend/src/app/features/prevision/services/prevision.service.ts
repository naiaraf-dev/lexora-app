import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  CalculoRequest, CalculoResultado, EstadoLiquidacion, LiquidacionListado, ModoPrevision,
  NuevaPrevision, PagoListado, PrevisionDetalle, PrevisionFiltros, PrevisionResumen, Prorrateo, Obligado,
} from '../models/prevision.model';
import { UiSelectOption } from '../../../shared/components/ui-select/ui-select';
import { MOCK_CATALOGOS, MOCK_PREVISIONES, mockAResumen, mockRecalcular } from '../models/prevision.mock';

/**
 * Service del módulo Previsión y pago.
 * 🔴 MOCK — Hoy responde con prevision.mock.ts. Cuando esté el back, cada método pasa a
 * usar HttpClient contra el endpoint que dice su comentario; los componentes no cambian.
 */
@Injectable({ providedIn: 'root' })
export class PrevisionService {
  private previsiones: PrevisionDetalle[] = structuredClone(MOCK_PREVISIONES);
  private siguienteId = 100;
  private readonly espera = 250; // simula la demora de red

  // ---------- Lecturas ----------

  /** GET /api/previsiones */
  listar(filtros: PrevisionFiltros = {}): Observable<PrevisionResumen[]> {
    const texto = (v?: string) => (v ?? '').toLowerCase().trim();
    const resultado = this.previsiones
      .filter(p =>
        (!filtros.expedienteId || p.expedienteId === filtros.expedienteId) &&
        (!texto(filtros.expediente) || p.expedienteNumero.toLowerCase().includes(texto(filtros.expediente))) &&
        (!texto(filtros.cliente) || p.cliente.toLowerCase().includes(texto(filtros.cliente))) &&
        (!filtros.estado || p.estado === filtros.estado) &&
        (!filtros.tipoObligacion || p.tipoObligacion === filtros.tipoObligacion) &&
        (!filtros.modo || p.modo === filtros.modo))
      .map(mockAResumen);
    return of(resultado).pipe(delay(this.espera));
  }

  /** GET /api/previsiones?expediente=:id */
  listarPorExpediente(expedienteId: number): Observable<PrevisionResumen[]> {
    return this.listar({ expedienteId });
  }

  /** GET /api/previsiones/:id */
  obtener(id: number): Observable<PrevisionDetalle> {
    const p = this.buscar(id);
    return p ? of(structuredClone(p)).pipe(delay(this.espera)) : this.error(404, 'No existe la previsión');
  }

  /** GET /api/previsiones/liquidaciones (pestaña global) */
  listarLiquidaciones(): Observable<LiquidacionListado[]> {
    const filas = this.previsiones.flatMap(p =>
      p.liquidaciones.map(l => ({ ...l, previsionId: p.id, expedienteNumero: p.expedienteNumero, cliente: p.cliente })));
    return of(filas).pipe(delay(this.espera));
  }

  /** GET /api/previsiones/pagos (pestaña global) */
  listarPagos(): Observable<PagoListado[]> {
    const filas = this.previsiones.flatMap(p =>
      p.pagos.map(x => ({ ...x, previsionId: p.id, expedienteNumero: p.expedienteNumero, cliente: p.cliente })));
    return of(filas).pipe(delay(this.espera));
  }

  /** GET /api/enums/:nombre (estadoprevision, tipoobligacion, conceptoprevision, estadoliquidacion, mediopago) */
  obtenerCatalogo(nombre: string): Observable<UiSelectOption[]> {
    return of(MOCK_CATALOGOS[nombre] ?? []);
  }

  /** POST /api/previsiones/calcular — previsualización sin guardar */
  calcular(req: CalculoRequest): Observable<CalculoResultado> {
    const dias = Math.max(0, Math.round((Date.parse(req.fechaHasta) - Date.parse(req.fechaDesde)) / 864e5));
    const tasaValor = 55; // 🔴 MOCK: el back la trae del CPACF con tasas.service
    const intereses = Math.round(req.montoBase * (tasaValor / 100) * (dias / 365));
    const otros = req.otros ?? 0;
    return of({
      capital: req.montoBase, intereses, otros, total: req.montoBase + intereses + otros,
      tasaValor, tasaFechaPublicacion: null, dias,
      metodologia: `Interés simple: capital × ${tasaValor}% × ${dias}/365 (valor de prueba)`,
    }).pipe(delay(this.espera));
  }

  // ---------- Escrituras ----------

  /** POST /api/previsiones */
  crear(body: NuevaPrevision): Observable<PrevisionDetalle> {
    // 🔴 MOCK: el back proyecta con la tasa real; acá 55% anual de prueba
    const dias = body.fechaResolucion && body.fechaEstimadaPago
      ? Math.max(0, Math.round((Date.parse(body.fechaEstimadaPago) - Date.parse(body.fechaResolucion)) / 864e5))
      : 0;
    const montoPrevisto = Math.round(body.montoBase * (1 + 0.55 * dias / 365));
    
    const p: PrevisionDetalle = {
      id: this.siguienteId++, expedienteId: body.expedienteId, expedienteNumero: `EXP-2026-${body.expedienteId}`,
      caratula: '(carátula del expediente)', cliente: '(cliente del expediente)', area: '', tipoExpediente: '', fuero: null,
      tipoObligacion: body.tipoObligacion, obligado: body.obligado, obligadoDetalle: body.obligadoDetalle,
      obligadoNombre: body.obligado === 'CLIENTE' ? '(cliente del expediente)' : body.obligadoDetalle ?? '',
      modo: body.modo, estado: 'Registrado', fechaResolucion: body.fechaResolucion, fechaFirmeza: body.fechaFirmeza,
      fechaEstimadaPago: body.fechaEstimadaPago, ejercicio: body.ejercicio, tasa: body.tasa,
      fechaPrevisionado: null, observaciones: body.observaciones,
      montoBase: body.montoBase, montoPrevisto: montoPrevisto, totalLiquidacionVigente: null, totalPagado: 0, saldo: 0,
            items: body.items, liquidaciones: [], impulsos: [], pagos: [], acreditaciones: [], intimaciones: [],
      prorrateo: null, factura: null, marcas: [], alertas: [],
      historial: [{ fecha: this.hoy(), usuario: 'Nai', accion: 'Creó la previsión' }],
    };
    this.previsiones.unshift(p);
    return this.guardar(p);
  }

  /** POST /api/previsiones/:id/registrar */
  registrarPrevision(id: number, datos: { fechaPrevisionado: string; montoPrevisto: number }): Observable<PrevisionDetalle> {
    return this.accion(id, ['Registrado', 'En análisis'], p => {
      p.fechaPrevisionado = datos.fechaPrevisionado;
      p.montoPrevisto = datos.montoPrevisto;
      p.estado = 'Con previsión';
      return 'Registró la previsión';
    });
  }

  /** POST /api/previsiones/:id/liquidaciones */
  crearLiquidacion(id: number, datos: CalculoRequest & { fechaLiquidacion: string; estadoLiquidacion: EstadoLiquidacion; observaciones?: string }): Observable<PrevisionDetalle> {
    return this.accion(id, null, p => {
      p.liquidaciones.forEach(l => (l.vigente = false));
      const dias = Math.max(0, Math.round((Date.parse(datos.fechaHasta) - Date.parse(datos.fechaDesde)) / 864e5));
      const intereses = Math.round(datos.montoBase * 0.55 * (dias / 365));
      const otros = datos.otros ?? 0;
      p.liquidaciones.unshift({
        id: this.siguienteId++, numero: p.liquidaciones.length + 1, fechaLiquidacion: datos.fechaLiquidacion,
        fechaDesde: datos.fechaDesde, fechaHasta: datos.fechaHasta, tasa: datos.tasa, tasaValor: 55,
        capital: datos.montoBase, intereses, otros, total: datos.montoBase + intereses + otros,
        estadoLiquidacion: datos.estadoLiquidacion, vigente: true, observaciones: datos.observaciones ?? null,
      });
      return 'Cargó liquidación';
    });
  }

  /** PATCH /api/previsiones/:id/liquidaciones/:liqId */
  cambiarEstadoLiquidacion(id: number, liqId: number, estado: EstadoLiquidacion): Observable<PrevisionDetalle> {
    return this.accion(id, null, p => {
      const liq = p.liquidaciones.find(l => l.id === liqId);
      if (liq) liq.estadoLiquidacion = estado;
      return `Cambió la liquidación a ${estado}`;
    });
  }

  /** PUT /api/previsiones/:id/prorrateo */
  guardarProrrateo(id: number, datos: Prorrateo): Observable<PrevisionDetalle> {
    return this.accion(id, null, p => { p.prorrateo = { ...datos }; return 'Actualizó el prorrateo art. 730'; });
  }

  /** PUT /api/previsiones/:id/factura (multipart con el archivo) */
  guardarFactura(id: number, datos: { profesional: string; monto: number; fecha: string }, archivo: File | null): Observable<PrevisionDetalle> {
    return this.accion(id, null, p => {
      p.factura = { ...datos, documento: this.docMock(archivo) };
      return 'Cargó la factura de honorarios';
    });
  }

  /** POST /api/previsiones/:id/impulsos (multipart con la nota) */
  registrarImpulso(id: number, datos: { fecha: string; monto: number; observaciones?: string }, archivo: File | null): Observable<PrevisionDetalle> {
    return this.accion(id, ['Listo para impulsar'], p => {
      p.impulsos.unshift({ id: this.siguienteId++, ...datos, esDiferencia: p.impulsos.length > 0, documento: this.docMock(archivo) });
      p.estado = 'Impulsado';
      return 'Registró la solicitud de pago';
    });
  }

  /** POST /api/previsiones/:id/pagos (multipart con el comprobante) */
  registrarPago(
    id: number,
    datos: { fechaPago: string; monto: number; pagador: Obligado; pagadorDetalle: string | null; medioPago: string; referencia: string | null; observaciones?: string },
    archivo: File | null,
  ): Observable<PrevisionDetalle> {
    const p = this.buscar(id);
    const permitido = p && (p.estado === 'Impulsado' || (p.modo === 'SEGUIMIENTO' && p.estado === 'Con previsión'));
    if (!permitido) return this.error(409, 'La previsión no está en un estado que permita registrar pagos');
    return this.accion(id, null, prev => {
      prev.pagos.unshift({ id: this.siguienteId++, ...datos, documento: this.docMock(archivo) });
      const pagado = prev.pagos.reduce((s, x) => s + x.monto, 0);
      const total = prev.liquidaciones.find(l => l.vigente)?.total ?? prev.montoPrevisto;
      // Regla 3 del motor: saldo ≤ 0 → Pagado; si queda saldo vuelve a Con previsión / Listo
      prev.estado = pagado >= total ? 'Pagado' : 'Con previsión';
      return 'Registró pago';
    });
  }

  /** POST /api/previsiones/:id/acreditaciones (multipart con el proveído) */
  registrarAcreditacion(id: number, datos: { fecha: string; ordenaNotificar: boolean }, archivo: File | null): Observable<PrevisionDetalle> {
    return this.accion(id, ['Pagado'], p => {
      p.acreditaciones.unshift({
        id: this.siguienteId++, ...datos, documento: this.docMock(archivo),
        tareaId: datos.ordenaNotificar ? this.siguienteId++ : null, notificacionCumplida: false,
      });
      p.estado = 'Acreditado';
      return datos.ordenaNotificar ? 'Acreditó el pago y generó tarea de notificación' : 'Acreditó el pago';
    });
  }

  /** POST /api/previsiones/:id/intimaciones (multipart con la cédula o el proveído) */
  registrarIntimacion(
    id: number,
    datos: { fecha: string; fechaVencimiento: string; apercibimiento: string | null; observaciones?: string },
    archivo: File | null,
  ): Observable<PrevisionDetalle> {
    return this.accion(id, ['Registrado', 'En análisis', 'Con previsión', 'Listo para impulsar', 'Impulsado'], p => {
      // El back crea la tarea en Agenda (enviar_agenda = 1) con vencimiento = fechaVencimiento
      p.intimaciones.unshift({ id: this.siguienteId++, ...datos, documento: this.docMock(archivo), tareaId: this.siguienteId++ });
      return `Registró intimación de pago (vence ${datos.fechaVencimiento.split('-').reverse().join('/')})`;
    });
  }

  /** POST /api/previsiones/:id/cerrar */
  cerrar(id: number): Observable<PrevisionDetalle> {
    const p = this.buscar(id);
    if (p?.acreditaciones.some(a => a.ordenaNotificar && !a.notificacionCumplida)) {
      return this.error(409, 'Hay una notificación pendiente: cumplí la tarea antes de cerrar');
    }
    return this.accion(id, ['Acreditado'], prev => { prev.estado = 'Cerrado'; return 'Cerró la previsión'; });
  }

  /** PATCH /api/previsiones/:id/modo */
  cambiarModo(id: number, modo: ModoPrevision): Observable<PrevisionDetalle> {
    return this.accion(id, null, p => { p.modo = modo; return `Cambió el modo a ${modo === 'ACTIVO' ? 'Activo' : 'Seguimiento'}`; });
  }

  // ---------- Helpers del mock ----------

  private buscar(id: number): PrevisionDetalle | undefined {
    return this.previsiones.find(p => p.id === id);
  }

  /** Ejecuta una acción validando el estado (el back responde 409 igual). */
  private accion(id: number, estadosPermitidos: string[] | null, cambio: (p: PrevisionDetalle) => string): Observable<PrevisionDetalle> {
    const p = this.buscar(id);
    if (!p) return this.error(404, 'No existe la previsión');
    if (p.estado === 'Cerrado') return this.error(409, 'La previsión está cerrada');
    if (estadosPermitidos && !estadosPermitidos.includes(p.estado)) {
      return this.error(409, `La previsión debe estar en ${estadosPermitidos.join(' o ')} para esta acción`);
    }
    const anterior = p.estado;
    const accion = cambio(p);
    mockRecalcular(p);
    p.historial.unshift({ fecha: this.hoy(), usuario: 'Nai', accion, detalle: anterior !== p.estado ? `${anterior} → ${p.estado}` : undefined });
    return this.guardar(p);
  }

  private guardar(p: PrevisionDetalle): Observable<PrevisionDetalle> {
    mockRecalcular(p);
    return of(structuredClone(p)).pipe(delay(this.espera));
  }

  private error(status: number, mensaje: string): Observable<never> {
    return throwError(() => ({ status, error: { mensaje } })).pipe(delay(this.espera));
  }

  private docMock(archivo: File | null) {
    return archivo ? { id: this.siguienteId++, nombre: archivo.name, url: URL.createObjectURL(archivo) } : null;
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}