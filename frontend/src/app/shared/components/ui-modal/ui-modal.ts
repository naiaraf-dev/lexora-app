import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [],
  templateUrl: './ui-modal.html',
})
export class UiModal {
  @Input() open = false;
  @Input() headerClass = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Output() cerrar = new EventEmitter<void>();

  get sizeClass(): string {
    const map = {
      sm: 'max-w-md',
      md: 'max-w-xl',
      lg: 'max-w-3xl',
      xl: 'max-w-5xl',
    };
    return map[this.size];
  }
}