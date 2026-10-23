import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PrevisionService } from './prevision.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

// Catálogos tal como los devuelve /api/enums (ordenados por nombre, como hace enums.repository)
const ESTADOS = [
  { id: 6, nombre: 'Pagado' }, { id: 3, nombre: 'Con previsión' }, { id: 1, nombre: 'Registrado' },
];
const TIPOS = [{ id: 2, nombre: 'Regulación de honorarios' }, { id: 1, nombre: 'Sentencia' }];
const CONCEPTOS = [{ id: 3, nombre: 'Honorarios' }, { id: 1, nombre: 'Capital' }];
const TASAS = [{ id: 25, nombre: 'Tasa Pasiva BCRA' }];
const MEDIOS = [{ id: 1, nombre: 'Transferencia' }];

/** Fila de /api/previsiones como la arma el back (snake_case, ids y objetos { id, nombre }). */
const PREVISION_BACK = {
  id: 7, expediente: 29, numeroExpediente: 'EXP-2026-29', caratula: 'PRUEBA-INTEGRACION',
  cliente: { id: 4, nombre: 'Empresa S.A.' }, tipoObligacion: { id: 1, nombre: 'Sentencia' },
  obligado: 'contraparte', obligado_detalle: 'Aseguradora', obligadoNombre: 'Aseguradora',
  modo: 'seguimiento', estado: { id: 3, nombre: 'Con previsión' }, tasaInfo: { id: 25, nombre: 'Tasa Pasiva BCRA' },
  fecha_resolucion: '2026-06-10T00:00:00.000Z', monto_base: 5000000, intereses_estimados: 1100000.5,
  monto_previsto: 6100000.5, totalLiquidacionVigente: null, totalPagado: 0, saldo: null, tasa_valor: null,
  items: [{ id: 1, conceptoNombre: 'Capital', monto_base: 5000000, instancia: null, observaciones: null }],
  liquidaciones: [], pagos: [{
    id: 9, fecha_pago: '2026-08-01T00:00:00.000Z', monto: 100, pagador: 'TERCERO', pagador_detalle: 'Aseguradora',
    medioPagoNombre: 'Transferencia', referencia: null, documento: 15, documentoNombre: 'comprobante.pdf',
  }],
  impulsos: [],
};

describe('PrevisionService', () => {
  let service: PrevisionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrevisionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerCatalogo devuelve opciones por nombre en el orden de los ids', () => {
    let opciones: any[] = [];
    service.obtenerCatalogo('estadoprevision').subscribe(o => (opciones = o));
    http.expectOne(`${API}/enums/estadoprevision`).flush(ESTADOS);

    expect(opciones.map(o => o.value)).toEqual(['Registrado', 'Con previsión', 'Pagado']);
  });

  it('pide cada catálogo una sola vez', () => {
    service.obtenerCatalogo('mediopago').subscribe();
    service.obtenerCatalogo('mediopago').subscribe();
    http.expectOne(`${API}/enums/mediopago`).flush(MEDIOS);
  });

  it('listar traduce los filtros a ids y mapea la respuesta paginada', () => {
    let res: any;
    service.listar({ estado: 'Con previsión', tipoObligacion: 'Sentencia', modo: 'SEGUIMIENTO', pagina: 2, pageSize: 10 })
      .subscribe(r => (res = r));
    http.expectOne(`${API}/enums/estadoprevision`).flush(ESTADOS);
    http.expectOne(`${API}/enums/tipoobligacion`).flush(TIPOS);

    const req = http.expectOne(r => r.url === `${API}/previsiones`);
    expect(req.request.params.get('estado')).toBe('3');
    expect(req.request.params.get('tipoObligacion')).toBe('1');
    expect(req.request.params.get('modo')).toBe('seguimiento');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ data: [PREVISION_BACK], total: 11, pagina: 2, pageSize: 10,
      resumen: { activas: 11, totalPrevisto: 1234.5, pendientesPago: 2, pagadas: 3 } });

    expect(res.total).toBe(11);
    expect(res.resumen.totalPrevisto).toBe(1234.5);
    const fila = res.data[0];
    expect(fila.estado).toBe('Con previsión');
    expect(fila.modo).toBe('SEGUIMIENTO');
    expect(fila.obligado).toBe('CONTRAPARTE');
    expect(fila.cliente).toBe('Empresa S.A.');
    expect(fila.fechaResolucion).toBe('2026-06-10');
    expect(fila.saldo).toBeNull();
  });

  it('obtener mapea el detalle y deja vacío lo que el back todavía no manda', () => {
    let p: any;
    service.obtener(7).subscribe(r => (p = r));
    http.expectOne(`${API}/previsiones/7`).flush(PREVISION_BACK);

    expect(p.interesesEstimados).toBe(1100000.5);
    expect(p.tasa).toBe('Tasa Pasiva BCRA');
    expect(p.items[0]).toEqual({ id: 1, concepto: 'Capital', monto: 5000000, instancia: null, observaciones: null });
    expect(p.pagos[0].medioPago).toBe('Transferencia');
    expect(p.pagos[0].documento).toEqual({
      id: 15, nombre: 'comprobante.pdf', url: `${API}/documento/15/descargar`,
    });
    expect(p.historial).toEqual([]);
    expect(p.marcas).toEqual([]);
    expect(p.alertas).toEqual([]);
  });

  it('crear envía snake_case, ids y modo/obligado en minúscula', () => {
    service.crear({
      expedienteId: 29, tipoObligacion: 'Sentencia', obligado: 'CLIENTE', obligadoDetalle: null, modo: 'ACTIVO',
      fechaResolucion: '2026-06-10', fechaFirmeza: null, fechaEstimadaPago: '2026-12-31', ejercicio: null,
      montoBase: 5000000, interesesEstimados: 1100000, tasa: 'Tasa Pasiva BCRA', tasaValor: 31.5, observaciones: null,
      items: [{ concepto: 'Honorarios', monto: 200000, instancia: 'Primera', observaciones: null }],
    }).subscribe();
    http.expectOne(`${API}/enums/tipoobligacion`).flush(TIPOS);
    http.expectOne(`${API}/enums/conceptoprevision`).flush(CONCEPTOS);
    http.expectOne(`${API}/enums/tasa`).flush(TASAS);

    const req = http.expectOne(`${API}/previsiones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      expediente: 29, tipo_obligacion: 1, modo: 'activo', obligado: 'cliente', tasa: 25, tasa_valor: 31.5,
      monto_base: 5000000, intereses_estimados: 1100000,
      items: [{ concepto_prevision: 3, monto_base: 200000, instancia: 'Primera', observaciones: null }],
    });
    req.flush(PREVISION_BACK);
  });

  it('registrarPago manda multipart con el medio de pago por id y el comprobante', () => {
    const archivo = new File(['%PDF'], 'comprobante.pdf', { type: 'application/pdf' });
    service.registrarPago(7, {
      fechaPago: '2026-08-01', monto: 100.5, pagador: 'TERCERO', pagadorDetalle: 'Aseguradora',
      medioPago: 'Transferencia', referencia: null,
    }, archivo).subscribe();
    http.expectOne(`${API}/enums/mediopago`).flush(MEDIOS);

    const req = http.expectOne(`${API}/previsiones/7/pagos`);
    const fd = req.request.body as FormData;
    expect(fd.get('medio_pago')).toBe('1');
    expect(fd.get('monto')).toBe('100.5');
    expect(fd.get('pagador')).toBe('TERCERO');
    expect(fd.has('referencia')).toBe(false);
    expect((fd.get('archivo') as File).name).toBe('comprobante.pdf');
    req.flush(PREVISION_BACK);
  });

  it('obtener mapea el bloque B: acreditaciones, intimaciones, prorrateo, factura, historial, marcas y alertas', () => {
    let p: any;
    service.obtener(7).subscribe(r => (p = r));
    http.expectOne(`${API}/previsiones/7`).flush({
      ...PREVISION_BACK,
      acreditaciones: [{ id: 1, fecha: '2026-10-01T00:00:00.000Z', documento: 20, documentoNombre: 'proveido.pdf',
        ordena_notificar: true, tarea: 300, tareaEstado: 1 }],
      intimaciones: [{ id: 2, fecha: '2026-09-01T00:00:00.000Z', fecha_vencimiento: '2026-09-11T00:00:00.000Z',
        apercibimiento: 'ejecución', documento: null, tarea: 301, observaciones: null }],
      prorrateo: { aprobado: true, verificado: false, fecha_aprobacion: null, resolucion: 'Res. 1/2026',
        base_calculo: 1000, honorarios_sujetos: 500, coeficiente: 0.25, monto_prorrateado: 125 },
      factura: { profesional: 'Perito Gómez', monto: 300000, fecha: '2026-09-05T00:00:00.000Z', documento: 21, documentoNombre: 'factura.pdf' },
      historial: [{ fecha: '2026-10-01T15:30:00.000Z', usuarioNombre: 'Prueba Integración', accion: 'Registró la acreditación', detalle: null }],
      marcas: ['Notificación pendiente'],
      alertas: [{ tipo: 'info', titulo: 'Saldo a favor', descripcion: 'Lo pagado supera el total en $ 10,00.' }],
    });

    expect(p.acreditaciones[0]).toEqual({
      id: 1, fecha: '2026-10-01', ordenaNotificar: true, tareaId: 300, notificacionCumplida: false,
      documento: { id: 20, nombre: 'proveido.pdf', url: `${API}/documento/20/descargar` },
    });
    expect(p.intimaciones[0].fechaVencimiento).toBe('2026-09-11');
    expect(p.prorrateo).toMatchObject({ aprobado: true, verificado: false, coeficiente: 0.25, montoProrrateado: 125 });
    expect(p.factura).toMatchObject({ profesional: 'Perito Gómez', monto: 300000, fecha: '2026-09-05' });
    expect(p.historial[0]).toEqual({ fecha: '2026-10-01', usuario: 'Prueba Integración', accion: 'Registró la acreditación', detalle: undefined });
    expect(p.marcas).toEqual(['Notificación pendiente']);
    expect(p.alertas[0].titulo).toBe('Saldo a favor');
  });

  it('registrarAcreditacion manda multipart con ordena_notificar y el proveído', () => {
    const archivo = new File(['%PDF'], 'proveido.pdf', { type: 'application/pdf' });
    service.registrarAcreditacion(7, { fecha: '2026-10-01', ordenaNotificar: true }, archivo).subscribe();
    const req = http.expectOne(`${API}/previsiones/7/acreditaciones`);
    const fd = req.request.body as FormData;
    expect(fd.get('ordena_notificar')).toBe('true');
    expect((fd.get('archivo') as File).name).toBe('proveido.pdf');
    req.flush(PREVISION_BACK);
  });

  it('un nombre que no está en el catálogo corta con un error legible', () => {
    let error: any;
    service.cambiarEstadoLiquidacion(7, 1, 'Inexistente' as any).subscribe({ error: e => (error = e) });
    http.expectOne(`${API}/enums/estadoliquidacion`).flush([{ id: 4, nombre: 'Aprobada / firme' }]);

    expect(error.error.mensaje).toContain('Inexistente');
  });

  it('obtenerTasaVigente pasa la fecha del CPACF a YYYY-MM-DD y normaliza el error', () => {
    let tasa: any;
    service.obtenerTasaVigente('Tasa Pasiva BCRA').subscribe(t => (tasa = t));
    http.expectOne(r => r.url === `${API}/tasa`).flush({ nombre: 'Tasa Pasiva BCRA', fecha: '3/10/2026', valor: 31.5 });
    expect(tasa).toEqual({ nombre: 'Tasa Pasiva BCRA', valor: 31.5, fechaPublicacion: '2026-10-03' });

    let error: any;
    service.obtenerTasaVigente('Indemnización por despido').subscribe({ error: e => (error = e) });
    http.expectOne(r => r.url === `${API}/tasa`)
      .flush({ error: 'La opción solicitada no posee un último valor de tasa disponible' }, { status: 422, statusText: 'Unprocessable' });
    expect(error.error.mensaje).toBe('La opción solicitada no posee un último valor de tasa disponible');
  });
});
