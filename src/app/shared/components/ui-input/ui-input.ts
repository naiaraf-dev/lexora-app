import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

  mostrarPassword = signal(false);

  esPassword = computed(() => this.type === 'password');

  tipoEfectivo = computed(() =>
    this.esPassword() ? (this.mostrarPassword() ? 'text' : 'password') : this.type
  );

  togglePassword() {
    this.mostrarPassword.set(!this.mostrarPassword());
  }
}