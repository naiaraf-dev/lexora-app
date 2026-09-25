import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UiSelectOption {
  label: string;
  value: string;
}

/**
 * Selector desplegable propio de la app — reemplaza el <select> nativo del navegador,
 * que se ve distinto según sistema operativo. Mantiene la misma interfaz pública
 * (label, options, model, modelChange) que la versión anterior, así que no hace falta
 * tocar ningún lugar donde ya se usa <app-ui-select>.
 */
@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-select.html',
})
export class UiSelect {
  @Input() label = '';
  @Input() options: UiSelectOption[] = [];
  @Input() model: any;
  @Output() modelChange = new EventEmitter<any>();

  abierto = false;
  abrirHaciaArriba = false;

  constructor(private elementRef: ElementRef) {}

  get etiquetaSeleccionada(): string {
    const opcion = this.options.find(o => o.value === this.model);
    return opcion?.label ?? 'Todos';
  }

  toggleAbierto(): void {
    if (!this.abierto) {
      this.calcularDireccionApertura();
    }
    this.abierto = !this.abierto;
  }

  elegir(valor: string): void {
    this.modelChange.emit(valor);
    this.abierto = false;
  }

  /** Mismo criterio que el date input: si no hay espacio abajo, el panel abre hacia arriba. */
  private calcularDireccionApertura(): void {
    const ALTO_ESTIMADO_POR_OPCION = 36;
    const ALTO_MAXIMO_PANEL = 260;
    const altoEstimado = Math.min((this.options.length + 1) * ALTO_ESTIMADO_POR_OPCION, ALTO_MAXIMO_PANEL);

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;

    this.abrirHaciaArriba = espacioAbajo < altoEstimado;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.abierto && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.abierto = false;
    }
  }
}