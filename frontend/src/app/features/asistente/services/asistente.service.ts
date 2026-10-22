import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  EnlaceDescarga,
  ErrorLitis,
  MensajeHistorial,
  ModoDescarga,
  PedidoLitis,
  RespuestaLitis,
  ResultadoLitis,
} from '../models/asistente.model';

export interface MensajeChat {
  autor: 'usuario' | 'litis';
  texto: string;
  hora: string;
  resultados?: ResultadoLitis[]; // tarjetas devueltas por Litis
  error?: boolean;               // mensaje de error: se muestra pero no se envía en el historial
}

export interface Conversacion {
  id: string;
  titulo: string;
  contexto?: string; // número de expediente si la conversación nació desde una tab de expediente
  mensajes: MensajeChat[];
  actualizada: Date;
}

// mensajes anteriores que se envían como contexto (el backend acepta hasta 10)
const MAX_MENSAJES_HISTORIAL = 10;

const SIN_CONEXION = 'No me pude conectar con el servidor. Revisá tu conexión y probá de nuevo.';

/** Chat con Litis: conversa con POST /api/asistente/mensajes (HU30). */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/asistente`;

  conversaciones = signal<Conversacion[]>([]);
  conversacionActualId = signal<string | null>(null);
  cargando = signal(false);

  conversacionActual = computed(() =>
    this.conversaciones().find(c => c.id === this.conversacionActualId()) ?? null
  );

  mensajes = computed(() => this.conversacionActual()?.mensajes ?? []);

  // solo cosas que Litis puede resolver con sus herramientas o con la guía de uso
  get sugerencias(): string[] {
    const contexto = this.conversacionActual()?.contexto;
    return contexto
      ? [
          '¿Qué tareas están pendientes en este expediente?',
          '¿Cuál es el último movimiento procesal?',
          '¿Qué documentos tiene este expediente?',
          'Resumime la última sentencia',
        ]
      : [
          '¿Cómo genero una liquidación de intereses?',
          '¿Qué expedientes tienen tareas vencidas?',
          '¿Cómo cambio el estado de un expediente?',
          '¿Cómo agrupo expedientes bajo la misma causa?',
        ];
  }

  /**
   * Crea una conversación nueva (global o contextualizada a un expediente) y la selecciona.
   * Si ya hay una sin mensajes del usuario para ese contexto, la reutiliza en vez de apilar vacías.
   */
  nuevaConversacion(contexto?: string): void {
    const vacia = this.conversaciones().find(c => c.contexto === contexto && !this.tieneMensajesDelUsuario(c));
    if (vacia) {
      this.conversacionActualId.set(vacia.id);
      return;
    }

    const id = crypto.randomUUID();
    const saludo: MensajeChat = {
      autor: 'litis',
      texto: contexto
        ? `¡Hola! Soy Litis. Puedo ayudarte con el expediente ${contexto}: ver sus tareas y novedades, buscar documentos, leerlos o responder dudas sobre él. ¿Qué necesitás?`
        : '¡Hola! Soy Litis, tu asistente en Lexora. Puedo ayudarte a moverte por el sistema, encontrar expedientes, documentos, clientes, tareas y novedades, o responder dudas generales. ¿En qué te puedo ayudar?',
      hora: this.horaActual(),
    };

    const nueva: Conversacion = {
      id,
      titulo: 'Nueva conversación',
      contexto,
      mensajes: [saludo],
      actualizada: new Date(),
    };

    this.conversaciones.update(list => [nueva, ...list]);
    this.conversacionActualId.set(id);
  }

  /** Abre una conversación existente. Si no hay ninguna para ese contexto, crea una. */
  iniciar(contexto?: string): void {
    const existentes = this.conversaciones().filter(c => c.contexto === contexto);
    if (existentes.length === 0) {
      this.nuevaConversacion(contexto);
    } else {
      this.conversacionActualId.set(existentes[0].id);
    }
  }

  seleccionarConversacion(id: string): void {
    this.conversacionActualId.set(id);
  }

  /**
   * Conversaciones a listar en el sidebar, filtradas por contexto (undefined = todas las globales).
   * Las que todavía no tienen mensajes del usuario no se listan: se verían como un segundo botón "Nueva conversación".
   */
  conversacionesPorContexto(contexto?: string): Conversacion[] {
    return this.conversaciones()
      .filter(c => c.contexto === contexto && this.tieneMensajesDelUsuario(c))
      .sort((a, b) => b.actualizada.getTime() - a.actualizada.getTime());
  }

  /** Devuelve false si no se pudo enviar (texto vacío o Litis todavía está respondiendo). */
  enviar(texto: string): boolean {
    const conv = this.conversacionActual();
    const mensaje = texto.trim();
    if (!mensaje || !conv || this.cargando()) return false;

    const esPrimerMensajeUsuario = !this.tieneMensajesDelUsuario(conv);
    const pedido: PedidoLitis = {
      mensaje,
      historial: this.historialPara(conv),
      ...(conv.contexto ? { contexto: conv.contexto } : {}),
    };

    this.agregarMensaje(conv.id, { autor: 'usuario', texto: mensaje, hora: this.horaActual() }, {
      titulo: esPrimerMensajeUsuario ? mensaje.slice(0, 40) : undefined,
    });
    this.cargando.set(true);

    this.http.post<RespuestaLitis>(`${this.base}/mensajes`, pedido).subscribe({
      next: (respuesta) => {
        this.agregarMensaje(conv.id, {
          autor: 'litis',
          texto: respuesta.respuesta,
          resultados: respuesta.resultados,
          hora: this.horaActual(),
        });
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.agregarMensaje(conv.id, { autor: 'litis', texto: this.mensajeDeError(error), error: true, hora: this.horaActual() });
        this.cargando.set(false);
      },
    });
    return true;
  }

  /**
   * Abre un documento encontrado por Litis. La pestaña se abre en el momento del clic
   * (si se abriera despues de la respuesta, el navegador la bloquearia) y se completa
   * con el enlace temporal que devuelve el backend (HU39).
   */
  abrirDocumento(documentoId: number, modo: ModoDescarga, alFallar: (mensaje: string) => void): void {
    const pestania = window.open('', '_blank');

    this.http.post<EnlaceDescarga>(`${this.base}/documentos/${documentoId}/enlace`, { modo }).subscribe({
      next: ({ url }) => {
        const destino = `${environment.apiUrl.replace(/\/api\/?$/, '')}${url}`;
        if (pestania) pestania.location.href = destino;
        else window.location.href = destino;
      },
      error: (error: HttpErrorResponse) => {
        pestania?.close();
        alFallar(this.mensajeDeError(error));
      },
    });
  }

  private tieneMensajesDelUsuario(conv: Conversacion): boolean {
    return conv.mensajes.some(m => m.autor === 'usuario');
  }

  // mensajes anteriores en el formato del contrato, sin los de error
  private historialPara(conv: Conversacion): MensajeHistorial[] {
    return conv.mensajes
      .filter(m => !m.error)
      .slice(-MAX_MENSAJES_HISTORIAL)
      .map(({ autor, texto }) => ({ autor, texto }));
  }

  // los errores del backend vienen con { codigo, mensaje } listo para mostrar al usuario
  private mensajeDeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as Partial<ErrorLitis> | null;
    if (cuerpo?.mensaje) return cuerpo.mensaje;
    return error.status === 0 ? SIN_CONEXION : 'Ocurrió un error. Probá de nuevo en unos minutos.';
  }

  private agregarMensaje(id: string, mensaje: MensajeChat, cambios: { titulo?: string } = {}): void {
    this.conversaciones.update(list => list.map(c => c.id === id
      ? {
          ...c,
          titulo: cambios.titulo ?? c.titulo,
          mensajes: [...c.mensajes, mensaje],
          actualizada: new Date(),
        }
      : c));
  }

  private horaActual(): string {
    return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}
