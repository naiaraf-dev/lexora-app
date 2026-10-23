import { Component, ElementRef, Input, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AsistenteService } from '../../services/asistente.service';
import { ModoDescarga, ResultadoLitis } from '../../models/asistente.model';

// formatos que el navegador puede mostrar sin descargar
const EXTENSIONES_VISIBLES = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

@Component({
  selector: 'app-asistente-chat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asistente-chat.html',
})
export class AsistenteChat implements OnInit {
  /** Cuando se usa dentro de un expediente, pasar su número/carátula para contextualizar el chat. */
  @Input() contextoExpediente?: string;

  service = inject(AsistenteService);
  private router = inject(Router);
  // texto del campo; se usa para habilitar el boton de enviar
  input = signal('');

  @ViewChild('lista') private lista?: ElementRef<HTMLElement>;
  @ViewChild('campo') private campo?: ElementRef<HTMLInputElement>;

  constructor() {
    // cuando llega un mensaje (o aparece "Escribiendo..."), baja hasta el final del chat
    effect(() => {
      this.service.mensajes();
      this.service.cargando();
      setTimeout(() => {
        const elemento = this.lista?.nativeElement;
        if (elemento) elemento.scrollTop = elemento.scrollHeight;
      });
    });
  }

  ngOnInit(): void {
    this.service.iniciar(this.contextoExpediente);
  }

  get conversaciones() {
    return this.service.conversacionesPorContexto(this.contextoExpediente);
  }

  nuevaConversacion(): void {
    this.service.nuevaConversacion(this.contextoExpediente);
  }

  seleccionar(id: string): void {
    this.service.seleccionarConversacion(id);
  }

  enviar(): void {
    // si Litis todavia esta respondiendo no se envia, y el texto queda en el campo
    if (!this.service.enviar(this.input())) return;
    this.input.set('');
    // se vacia el elemento directamente: sin zone.js, si se escribe y se apreta Enter antes
    // de que se refresque la vista, un binding no detecta el cambio y el texto quedaba en el campo
    if (this.campo) this.campo.nativeElement.value = '';
  }

  usarSugerencia(s: string): void {
    this.service.enviar(s);
  }

  // ── tarjetas de resultados (HU30) ─────────────────────────────────────────

  sePuedeVer(resultado: ResultadoLitis): boolean {
    return resultado.tipo === 'documento' && EXTENSIONES_VISIBLES.includes(resultado.extension ?? '');
  }

  abrirDocumento(resultado: ResultadoLitis, modo: ModoDescarga): void {
    this.service.abrirDocumento(resultado.id, modo, (mensaje) => toast.error(mensaje));
  }

  irAlExpediente(resultado: ResultadoLitis): void {
    if (resultado.expedienteId) this.router.navigate(['/gestion-expedientes', resultado.expedienteId]);
  }

  icono(resultado: ResultadoLitis): string {
    switch (resultado.tipo) {
      case 'documento': return '📄';
      case 'expediente': return '📁';
      case 'cliente': return '👤';
      case 'tarea': return '✅';
      case 'novedad': return '📰';
      default: return '•';
    }
  }
}
