import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface BadgeConfig {
  label: string;
  classes: string;
  dot: string;
}

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-badge.html',
})
export class UiBadge {
  @Input() estado!: string;
  @Input() config!: Record<string, BadgeConfig>;

  get resolved(): BadgeConfig {
    return this.config?.[this.estado] ?? {
      label: this.estado,
      classes: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',
      dot: 'bg-gray-400',
    };
  }

  get label() { return this.resolved.label; }
  get classes() { return this.resolved.classes; }
  get dot() { return this.resolved.dot; }
}