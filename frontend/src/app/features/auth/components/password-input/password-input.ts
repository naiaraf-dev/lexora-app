import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './password-input.html',
})
export class PasswordInput {
  @Input() label = 'Contraseña';
  @Input() placeholder = 'Ingrese su contraseña...';
  @Input() name = 'password';
  @Input() model = '';
  @Output() modelChange = new EventEmitter<string>();

  showPassword = signal(false);

  toggle() {
    this.showPassword.update(v => !v);
  }
}