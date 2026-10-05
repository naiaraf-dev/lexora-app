import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenteService } from '../../services/asistente.service';

@Component({
  selector: 'app-asistente-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistente-chat.html',
})
export class AsistenteChat implements OnInit {
  /** Cuando se usa dentro de un expediente, pasar su número/carátula para contextualizar el chat. */
  @Input() contextoExpediente?: string;

  service = inject(AsistenteService);
  input = '';

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
    const texto = this.input;
    this.input = '';
    this.service.enviar(texto);
  }

  usarSugerencia(s: string): void {
    this.service.enviar(s);
  }
}