import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

// contador para darle a cada input un id único y asociarlo a su label (accesibilidad)
let siguienteId = 0;

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ui-input.html',
})
export class UiInput {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() model: any;
  @Output() modelChange = new EventEmitter<any>();
  @Input() disabled = false;
  @Input() type = 'text';

  readonly inputId = `ui-input-${siguienteId++}`;

  mostrarPassword = signal(false);

  esPassword = computed(() => this.type === 'password');

  tipoEfectivo = computed(() =>
    this.esPassword() ? (this.mostrarPassword() ? 'text' : 'password') : this.type
  );

  togglePassword() {
    this.mostrarPassword.set(!this.mostrarPassword());
  }
}