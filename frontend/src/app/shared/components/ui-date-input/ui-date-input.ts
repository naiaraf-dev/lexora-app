import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Una celda del grid del calendario (6 semanas x 7 días). */
interface CeldaCalendario {
  fecha: Date;
  dia: number;
  delMesActual: boolean;
  esHoy: boolean;
  seleccionado: boolean;
  deshabilitada: boolean;
}

/**
 * Selector de fecha propio de la app — reemplaza el <input type="date"> nativo, que
 * se ve distinto según sistema operativo/navegador. Mantiene la misma interfaz pública
 * (label, model, disabled, modelChange) que la versión anterior, así que no hace falta
 * tocar ningún lugar donde ya se usa <app-ui-date-input>. El modelo sigue siendo un
 * string ISO 'YYYY-MM-DD'.
 */
@Component({
  selector: 'app-ui-date-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-date-input.html',
})
export class UiDateInput {
  @Input() label = '';
  @Input() model: string = '';
  @Input() disabled = false;
  @Input() min?: string; // fecha mínima seleccionable (ISO 'YYYY-MM-DD'), opcional
  @Output() modelChange = new EventEmitter<string>();

  abierto = false;
  abrirHaciaArriba = false;

  /** Mes que se está mostrando en el calendario (no necesariamente el de la fecha seleccionada). */
  mesVisible = new Date();

  private readonly DIAS_SEMANA = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
  private readonly MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  constructor(private elementRef: ElementRef) {}

  get diasSemana(): string[] {
    return this.DIAS_SEMANA;
  }

  get etiquetaMes(): string {
    const texto = `${this.MESES[this.mesVisible.getMonth()]} de ${this.mesVisible.getFullYear()}`;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /** Fecha seleccionada como objeto Date, o null si el modelo está vacío. */
  private get fechaSeleccionada(): Date | null {
    if (!this.model) return null;
    const [anio, mes, dia] = this.model.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private get fechaMinima(): Date | null {
    if (!this.min) return null;
    const [anio, mes, dia] = this.min.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  /** Texto que se muestra en el campo cuando el calendario está cerrado. */
  get textoMostrado(): string {
    return this.fechaSeleccionada?.toLocaleDateString('es-AR') ?? '';
  }

  /** Arma el grid de 6 semanas x 7 días del mes visible (incluye días de meses adyacentes, en gris). */
  get celdas(): CeldaCalendario[] {
    const anio = this.mesVisible.getFullYear();
    const mes = this.mesVisible.getMonth();

    const primerDiaDelMes = new Date(anio, mes, 1);
    const inicioGrid = new Date(anio, mes, 1 - primerDiaDelMes.getDay());

    const hoy = new Date();
    const seleccionada = this.fechaSeleccionada;
    const celdas: CeldaCalendario[] = [];

    for (let i = 0; i < 42; i++) {
      const fecha = new Date(inicioGrid);
      fecha.setDate(inicioGrid.getDate() + i);

      const minima = this.fechaMinima;

      celdas.push({
        fecha,
        dia: fecha.getDate(),
        delMesActual: fecha.getMonth() === mes,
        esHoy: this.esMismoDia(fecha, hoy),
        seleccionado: !!seleccionada && this.esMismoDia(fecha, seleccionada),
        deshabilitada: !!minima && fecha < minima && !this.esMismoDia(fecha, minima),
      });
    }

    return celdas;
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  toggleAbierto(): void {
    if (this.disabled) return;

    if (!this.abierto) {
      this.mesVisible = this.fechaSeleccionada ?? new Date();
      this.calcularDireccionApertura();
    }
    this.abierto = !this.abierto;
  }

  /** Decide si el calendario abre hacia abajo (default) o hacia arriba, según el espacio disponible en la ventana. */
  private calcularDireccionApertura(): void {
    const ALTO_ESTIMADO_PANEL = 340;
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;

    this.abrirHaciaArriba = espacioAbajo < ALTO_ESTIMADO_PANEL;
  }

  mesAnterior(): void {
    this.mesVisible = new Date(this.mesVisible.getFullYear(), this.mesVisible.getMonth() - 1, 1);
  }

  mesSiguiente(): void {
    this.mesVisible = new Date(this.mesVisible.getFullYear(), this.mesVisible.getMonth() + 1, 1);
  }

  elegirDia(celda: CeldaCalendario): void {
    if (!celda.delMesActual || celda.deshabilitada) return;
    this.emitirFecha(celda.fecha);
  }

  irAHoy(): void {
    this.emitirFecha(new Date());
  }

  private emitirFecha(fecha: Date): void {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    this.modelChange.emit(`${yyyy}-${mm}-${dd}`);
    this.abierto = false;
  }

  borrar(): void {
    this.modelChange.emit('');
    this.abierto = false;
  }

  /** Cierra el calendario si se hace clic afuera del componente. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.abierto && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.abierto = false;
    }
  }
}