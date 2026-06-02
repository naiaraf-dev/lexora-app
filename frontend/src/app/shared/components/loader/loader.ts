import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.html',
})
export class Loader {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullScreen = false;
  @Input() overlay = false;
  @Input() text = '';

  get sizeClasses(): string {
    return {
      sm: 'w-4 h-4 border-2',
      md: 'w-6 h-6 border-2',
      lg: 'w-10 h-10 border-4',
    }[this.size];
  }
}
