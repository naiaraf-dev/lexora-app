import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-pagination.html',
})
export class UiPagination {
  paginaActual = input.required<number>();
  totalPaginas = input.required<number>();
  cambio       = output<number>();

  paginasVisibles = computed(() => {
    const total   = this.totalPaginas();
    const current = this.paginaActual();
    const pages: (number | '...')[] = [];

    if (total <= 6) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3)         pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  ir(p: number | '...') {
    if (typeof p !== 'number') return;
    if (p < 1 || p > this.totalPaginas()) return;
    this.cambio.emit(p);
  }
}