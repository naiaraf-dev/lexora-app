import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-primary-btn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './primary-btn.html',
})
export class PrimaryBtn {
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() loading = false;
  @Input() disabled = false;

  get classes(): string {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200';

    const variants = {
      primary: 'bg-primary text-white hover:bg-hover',
      secondary: 'bg-transparent border border-primary text-primary hover:bg-primary/10 active:bg-primary/20',
      danger: 'bg-danger text-white hover:bg-red-600',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    };

    const disabledState = (this.disabled || this.loading)
      ? 'opacity-50 cursor-not-allowed hover:bg-inherit'
      : '';

    return [
      base,
      variants[this.variant],
      sizes[this.size],
      disabledState
    ].join(' ');
  }
}
