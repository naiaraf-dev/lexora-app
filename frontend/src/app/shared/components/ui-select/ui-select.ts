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

  /** Posición calculada del panel flotante (position: fixed, para escapar de overflow de ancestros). */
  panelStyle: { top?: string; bottom?: string; left: string; width: string } = { left: '0px', width: '0px' };

  constructor(private elementRef: ElementRef) {}

  get etiquetaSeleccionada(): string {
    const opcion = this.options.find(o => o.value === this.model);
    return opcion?.label ?? 'Todos';
  }

  toggleAbierto(): void {
    if (!this.abierto) {
      this.calcularPosicion();
    }
    this.abierto = !this.abierto;
  }

  elegir(valor: string): void {
    this.modelChange.emit(valor);
    this.abierto = false;
  }

  /** Calcula la posición fija del panel según la posición real del botón en la ventana. */
  private calcularPosicion(): void {
    const ALTO_ESTIMADO_POR_OPCION = 36;
    const ALTO_MAXIMO_PANEL = 260;
    const altoEstimado = Math.min((this.options.length + 1) * ALTO_ESTIMADO_POR_OPCION, ALTO_MAXIMO_PANEL);

    const rect = this.elementRef.nativeElement.querySelector('button').getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;

    this.abrirHaciaArriba = espacioAbajo < altoEstimado;

    this.panelStyle = {
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      ...(this.abrirHaciaArriba
        ? { bottom: `${window.innerHeight - rect.top + 4}px` }
        : { top: `${rect.bottom + 4}px` }),
    };
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onWindowChange(): void {
    if (this.abierto) this.calcularPosicion();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.abierto && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.abierto = false;
    }
  }
}