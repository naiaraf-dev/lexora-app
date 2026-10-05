import { Injectable, signal, computed } from '@angular/core';

export interface MensajeChat {
  autor: 'usuario' | 'litis';
  texto: string;
  hora: string;
}

export interface Conversacion {
  id: string;
  titulo: string;
  contexto?: string; // número de expediente si la conversación nació desde una tab de expediente
  mensajes: MensajeChat[];
  actualizada: Date;
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  conversaciones = signal<Conversacion[]>([]);
  conversacionActualId = signal<string | null>(null);
  cargando = signal(false);

  conversacionActual = computed(() =>
    this.conversaciones().find(c => c.id === this.conversacionActualId()) ?? null
  );

  mensajes = computed(() => this.conversacionActual()?.mensajes ?? []);

  // 🔴 MOCK
  private respuestasMock: Record<string, string> = {
    '¿cómo genero una liquidación de intereses?':
      'Entrá al expediente correspondiente, andá a la pestaña "Previsión" y hacé clic en "Nueva liquidación". Vas a poder elegir el tipo de tasa y el período a calcular.',
    '¿qué expedientes tienen tareas vencidas?':
      'Podés verlo desde el módulo "Agenda", filtrando por estado "Vencida". Ahí aparecen todas las tareas automáticas y manuales que pasaron su fecha de vencimiento.',
    '¿cómo cambio el estado de un expediente?':
      'El cambio de estado se hace exclusivamente desde la pestaña "Estados" del expediente. Ahí vas a ver el pipeline completo y solo vas a poder avanzar si no quedan tareas pendientes en el estado actual.',
    '¿dónde subo un documento a un expediente?':
      'En la ficha del expediente, pestaña "Documentos", con el botón "Subir Documento". Podés asociarlo opcionalmente a una novedad puntual.',
    '¿cómo agrupo expedientes bajo la misma causa?':
      'Desde la grilla de "Gestión de expedientes", en las acciones de la fila vas a encontrar el ícono de agrupar. Ahí podés buscar la causa existente o crear una nueva.',
    '¿cómo marco una tarea como cumplida?':
      'Podés hacerlo desde la Agenda (botón de check en la tarea) o desde la pestaña "Estados" del expediente, dentro del checklist de tareas de cada estado.',
  };

  // 🔴 MOCK
  private respuestasContextoMock: Record<string, string> = {
    '¿qué tareas están pendientes en este expediente?':
      'Fijate en la pestaña "Estados" de este expediente — ahí vas a ver el checklist de tareas del estado actual, con las que faltan completar marcadas como pendientes.',
    '¿cuál es el último movimiento procesal?':
      'Lo vas a encontrar en la pestaña "Novedades" de este expediente, ordenado por fecha en el timeline.',
    '¿quién es el cliente de este expediente?':
      'Podés verlo en "Datos generales", en el campo Cliente. Desde ahí también podés ver su rol en este expediente en particular.',
    '¿hay documentos sin cargar?':
      'Revisá la pestaña "Documentos" de este expediente para ver todo lo cargado hasta el momento y detectar si falta algo.',
  };

  get sugerencias(): string[] {
    const contexto = this.conversacionActual()?.contexto;
    return contexto
      ? [
          '¿Qué tareas están pendientes en este expediente?',
          '¿Cuál es el último movimiento procesal?',
          '¿Quién es el cliente de este expediente?',
          '¿Hay documentos sin cargar?',
        ]
      : [
          '¿Cómo genero una liquidación de intereses?',
          '¿Qué expedientes tienen tareas vencidas?',
          '¿Cómo cambio el estado de un expediente?',
          '¿Cómo agrupo expedientes bajo la misma causa?',
        ];
  }

  /** Crea una conversación nueva (global o contextualizada a un expediente) y la selecciona. */
  nuevaConversacion(contexto?: string): void {
    const id = crypto.randomUUID();
    const saludo: MensajeChat = {
      autor: 'litis',
      texto: contexto
        ? `¡Hola! Soy Litis. Puedo ayudarte con el expediente ${contexto}: buscar novedades, tareas pendientes o documentos asociados. ¿Qué necesitás?`
        : '¡Hola! Soy Litis, tu asistente en Lexora. Puedo ayudarte a moverte por el sistema, encontrar expedientes o responder dudas generales. ¿En qué te puedo ayudar?',
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

  /** Conversaciones a listar en el sidebar, filtradas por contexto (undefined = todas las globales). */
  conversacionesPorContexto(contexto?: string): Conversacion[] {
    return this.conversaciones()
      .filter(c => c.contexto === contexto)
      .sort((a, b) => b.actualizada.getTime() - a.actualizada.getTime());
  }

  enviar(texto: string): void {
    const conv = this.conversacionActual();
    if (!texto.trim() || !conv) return;

    const esPrimerMensajeUsuario = !conv.mensajes.some(m => m.autor === 'usuario');

    this.actualizarConversacion(conv.id, c => ({
      ...c,
      titulo: esPrimerMensajeUsuario ? texto.slice(0, 40) : c.titulo,
      mensajes: [...c.mensajes, { autor: 'usuario', texto, hora: this.horaActual() }],
      actualizada: new Date(),
    }));

    this.cargando.set(true);

    // TODO: Simulación de respuesta — reemplazar por integración real
    setTimeout(() => {
      const clave = texto.trim().toLowerCase();
      const mapa = conv.contexto ? this.respuestasContextoMock : this.respuestasMock;
      const respuesta = mapa[clave]
        ?? 'Esta función todavía está en desarrollo. Por ahora puedo responder algunas preguntas frecuentes sobre el uso del sistema — probá con una de las sugerencias.';

      this.actualizarConversacion(conv.id, c => ({
        ...c,
        mensajes: [...c.mensajes, { autor: 'litis', texto: respuesta, hora: this.horaActual() }],
        actualizada: new Date(),
      }));
      this.cargando.set(false);
    }, 700);
  }

  private actualizarConversacion(id: string, cambio: (c: Conversacion) => Conversacion): void {
    this.conversaciones.update(list => list.map(c => c.id === id ? cambio(c) : c));
  }

  private horaActual(): string {
    return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}