import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [],
  templateUrl: './ui-modal.html',
})
export class UiModal {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();
}