import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { toast } from 'ngx-sonner';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { PrevisionService } from '../../services/prevision.service';
import { PrevisionDetalle } from '../../models/prevision.model';
import { formatMonto, hoyISO } from '../../models/prevision.constants';

/** Las acciones del flujo que se cargan con un formulario corto. */
export type TipoAccion = 'registrar' | 'impulso' | 'acreditacion' | 'factura' | 'intimacion';

interface ConfigAccion {
  titulo: string;
  ayuda: string;
  boton: string;
  labelFecha: string;
  labelMonto: string | null;     // null = no pide monto
  labelArchivo: string | null;   // null = no pide archivo
}

const CONFIG: Record<TipoAccion, ConfigAccion> = {
  registrar: {
    titulo: 'Registrar previsión',
    ayuda: 'Confirmá que el cliente reservó el monto en su presupuesto. La previsión pasa a "Con previsión".',
    boton: 'Registrar previsión',
    labelFecha: 'Fecha en que se previsionó *',
    labelMonto: 'Monto previsto *',
    labelArchivo: null,
  },
  impulso: {
    titulo: 'Registrar solicitud de pago',
    ayuda: 'Es el pedido de fondos a la Administración del cliente (impulso). La previsión pasa a "Impulsado".',
    boton: 'Registrar solicitud',
    labelFecha: 'Fecha de la solicitud *',
    labelMonto: 'Monto solicitado *',
    labelArchivo: 'Nota de solicitud',
  },
  acreditacion: {
    titulo: 'Registrar acreditación',
    ayuda: 'El juzgado tuvo por acreditado el pago. La previsión pasa a "Acreditado".',
    boton: 'Registrar acreditación',
    labelFecha: 'Fecha del proveído *',
    labelMonto: null,
    labelArchivo: 'Proveído',
  },
  factura: {
    titulo: 'Cargar factura de honorarios',
    ayuda: 'Sin factura no se puede impulsar el pago de honorarios.',
    boton: 'Guardar factura',
    labelFecha: 'Fecha de la factura *',
    labelMonto: 'Monto facturado *',
    labelArchivo: 'Factura',
  },
  intimacion: {
    titulo: 'Registrar intimación de pago',
    ayuda: 'El juzgado intimó al obligado a pagar en un plazo. No cambia el estado: genera una tarea en Agenda que vence ese día.',
    boton: 'Registrar intimación',
    labelFecha: 'Fecha de notificación *',
    labelMonto: null,
    labelArchivo: 'Cédula / proveído',
  },
};

/**
 * Modal de las acciones explícitas del flujo (sección 6 del documento técnico):
 * registrar previsión, impulso, acreditación y factura de honorarios.
 * Llama al PrevisionService y devuelve la previsión actualizada (con estado, marcas y alertas del back).
 */
@Component({
  selector: 'app-modal-accion-prevision',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiDateInput, PrimaryBtn],
  templateUrl: './modal-accion-prevision.html',
})
export class ModalAccionPrevision implements OnChanges {
  @Input() open = false;
  @Input() tipo: TipoAccion = 'registrar';
  @Input() prevision: PrevisionDetalle | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<PrevisionDetalle>();

  private previsionService = inject(PrevisionService);

  guardando = false;
  form = this.formVacio();
  archivo: File | null = null;

  formatMonto = formatMonto;

  get config(): ConfigAccion {
    return CONFIG[this.tipo];
  }

  /** Si ya hay factura, el modal es para reemplazarla. */
  get titulo(): string {
    return this.tipo === 'factura' && this.prevision?.factura ? 'Reemplazar factura de honorarios' : this.config.titulo;
  }

  /** Al reemplazar la factura: nombre del archivo que se conserva si no se adjunta otro. */
  get archivoActual(): string | null {
    return this.tipo === 'factura' ? this.prevision?.factura?.documento?.nombre ?? null : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.precargar();
  }

  /** Valores sugeridos según la acción. */
  private precargar(): void {
    this.form = this.formVacio();
    this.archivo = null;
    const p = this.prevision;
    if (!p) return;
    if (this.tipo === 'registrar') this.form.monto = p.montoPrevisto.toLocaleString('es-AR');
    // la diferencia, si ya hubo pagos
    if (this.tipo === 'impulso' && p.saldo !== null && p.saldo > 0) this.form.monto = p.saldo.toLocaleString('es-AR');
    // Reemplazar factura: arranca con los datos de la factura actual
    if (this.tipo === 'factura' && p.factura) {
      this.form.profesional = p.factura.profesional;
      this.form.monto = p.factura.monto.toLocaleString('es-AR');
      this.form.fecha = p.factura.fecha || hoyISO();
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.archivo = input.files[0];
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.archivo = file;
  }

  guardar(): void {
    const p = this.prevision;
    if (!p) return;
    const monto = this.parseMonto(this.form.monto);

    if (!this.form.fecha) { toast.error('Completá la fecha'); return; }
    if (this.config.labelMonto && !monto) { toast.error('Ingresá el monto'); return; }
    if (this.tipo === 'intimacion' && (!this.form.fechaVencimiento || this.form.fechaVencimiento < this.form.fecha)) {
      toast.error('La fecha de vencimiento tiene que ser posterior a la notificación');
      return;
    }

    let llamada: Observable<PrevisionDetalle>;
    switch (this.tipo) {
      case 'registrar':
        llamada = this.previsionService.registrarPrevision(p.id, { fechaPrevisionado: this.form.fecha, montoPrevisto: monto });
        break;
      case 'impulso':
        llamada = this.previsionService.registrarImpulso(
          p.id, { fecha: this.form.fecha, monto, observaciones: this.form.observaciones || undefined }, this.archivo);
        break;
      case 'acreditacion':
        llamada = this.previsionService.registrarAcreditacion(
          p.id, { fecha: this.form.fecha, ordenaNotificar: this.form.ordenaNotificar }, this.archivo);
        break;
      case 'intimacion':
        llamada = this.previsionService.registrarIntimacion(p.id, {
          fecha: this.form.fecha,
          fechaVencimiento: this.form.fechaVencimiento,
          apercibimiento: this.form.apercibimiento.trim() || null,
          observaciones: this.form.observaciones || undefined,
        }, this.archivo);
        break;
      case 'factura':
        llamada = this.previsionService.guardarFactura(
          p.id, { profesional: this.form.profesional.trim(), monto, fecha: this.form.fecha }, this.archivo);
        break;
    }

    this.guardando = true;
    llamada.subscribe({
      next: (actualizada) => {
        this.guardando = false;
        toast.success(`${this.titulo}: listo`);
        this.guardado.emit(actualizada);
        this.cerrar.emit();
      },
      error: (err) => {
        this.guardando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo guardar');
      },
    });
  }

  private formVacio() {
    return {
      fecha: hoyISO(),
      monto: '',
      profesional: '',
      ordenaNotificar: false,
      fechaVencimiento: '',
      apercibimiento: '',
      observaciones: '',
    };
  }

  /** "$ 5.000.000,50" → 5000000.5 */
  private parseMonto(valor: string): number {
    if (!valor) return 0;
    const limpio = String(valor).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
}