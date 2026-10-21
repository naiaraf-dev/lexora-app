import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect, UiSelectOption } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';
import { PrevisionService } from '../../services/prevision.service';
import { Obligado, PrevisionDetalle } from '../../models/prevision.model';
import { OBLIGADO_LABEL, OBLIGADO_OPTIONS, formatMonto, hoyISO } from '../../models/prevision.constants';

@Component({
  selector: 'app-modal-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-pago.html',
})
export class ModalPago implements OnChanges {
  @Input() open = false;
  /** La previsión a la que se le registra el pago (de ahí salen saldo y obligado). */
  @Input() prevision: PrevisionDetalle | null = null;
  @Output() cerrar = new EventEmitter<void>();
  /** Devuelve la previsión actualizada: el back recalcula saldo, estado y marcas. */
  @Output() guardado = new EventEmitter<PrevisionDetalle>();

  private previsionService = inject(PrevisionService);

  guardando = false;

  form = this.formVacio();
  comprobante: File | null = null;

  medioOptions: UiSelectOption[] = [];
  pagadorOptions = OBLIGADO_OPTIONS;
  readonly OBLIGADO_LABEL = OBLIGADO_LABEL;
  formatMonto = formatMonto;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.precargar();
  }

  /** Monto que hay que cubrir: la liquidación vigente si existe, si no el previsto. */
  get montoAPagar(): number {
    return this.prevision?.totalLiquidacionVigente ?? this.prevision?.montoPrevisto ?? 0;
  }

  /** Paga alguien distinto del obligado → el back agrega la marca "Pago de tercero informado". */
  get pagaOtro(): boolean {
    return !!this.prevision && this.form.pagador !== this.prevision.obligado;
  }

  /** Solo avisa: el back acepta pagar de más (el saldo queda ≤ 0 y la previsión pasa a Pagado). */
  get superaSaldo(): boolean {
    const saldo = this.prevision?.saldo;
    return saldo !== null && saldo !== undefined && this.parseMonto(this.form.monto) > saldo;
  }

  private precargar(): void {
    this.form = this.formVacio();
    this.comprobante = null;
    if (!this.medioOptions.length) {
      this.previsionService.obtenerCatalogo('mediopago').subscribe(o => (this.medioOptions = o));
    }
    const p = this.prevision;
    if (!p) return;
    // Monto sugerido = saldo (si hay saldo positivo)
    this.form.monto = p.saldo !== null && p.saldo > 0 ? p.saldo.toLocaleString('es-AR') : '';
    this.onPagadorChange(p.obligado);
  }

  /** Mismo criterio que el obligado del alta: Cliente sale del expediente; los otros llevan nombre. */
  onPagadorChange(pagador: Obligado): void {
    const p = this.prevision;
    this.form.pagador = pagador;
    this.form.pagadorDetalle = p && pagador === p.obligado && pagador !== 'CLIENTE' ? (p.obligadoDetalle ?? '') : '';
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.comprobante = input.files[0];
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.comprobante = file;
  }

  eliminarComprobante() {
    this.comprobante = null;
  }

  guardar() {
    const p = this.prevision;
    if (!p) return;
    const monto = this.parseMonto(this.form.monto);
    if (!this.form.fecha || !monto || !this.form.medio) {
      toast.error('Completá fecha, monto y medio de pago');
      return;
    }
    if (this.form.pagador !== 'CLIENTE' && !this.form.pagadorDetalle.trim()) {
      toast.error('Indicá quién pagó');
      return;
    }

    this.guardando = true;
    this.previsionService.registrarPago(p.id, {
      fechaPago: this.form.fecha,
      monto,
      pagador: this.form.pagador,
      pagadorDetalle: this.form.pagador === 'CLIENTE' ? null : this.form.pagadorDetalle.trim(),
      medioPago: this.form.medio,
      referencia: this.form.referencia || null,
      observaciones: this.form.observaciones || undefined,
    }, this.comprobante).subscribe({
      next: (actualizada) => {
        this.guardando = false;
        toast.success('Pago registrado');
        this.guardado.emit(actualizada);
        this.cerrarModal();
      },
      error: (err) => {
        this.guardando = false;
        toast.error(err?.error?.mensaje ?? 'No se pudo registrar el pago');
      },
    });
  }

  cerrarModal() {
    this.form = this.formVacio();
    this.comprobante = null;
    this.cerrar.emit();
  }

  private formVacio() {
    return {
      fecha: hoyISO(),
      monto: '',
      pagador: 'CLIENTE' as Obligado,
      pagadorDetalle: '',
      medio: '',
      referencia: '',
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