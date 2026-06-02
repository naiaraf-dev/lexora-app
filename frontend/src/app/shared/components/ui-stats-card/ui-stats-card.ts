import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

type StatColor = 'default' | 'success' | 'danger' | 'warning' | 'primary';

@Component({
  selector: 'app-ui-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-stats-card.html',
})
export class UiStatCard {
  label = input.required<string>();
  value = input.required<number | string>();
  color = input<StatColor>('default');

  colorClass(): string {
    const map: Record<StatColor, string> = {
      default: 'text-text-primary',
      success: 'text-success',
      danger:  'text-danger',
      warning: 'text-warning',
      primary: 'text-primary',
    };
    return map[this.color()];
  }

  bgClass(): string {
    const map: Record<StatColor, string> = {
      default: 'bg-white',
      success: 'bg-success/5',
      danger:  'bg-danger/5',
      warning: 'bg-warning/5',
      primary: 'bg-primary/5',
    };
    return map[this.color()];
  }
}