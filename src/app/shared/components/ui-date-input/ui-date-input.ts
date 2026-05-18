import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-date-input',
  standalone: true,
  templateUrl: './ui-date-input.html',
})
export class UiDateInput {
  @Input() label = '';
  @Input() model: string = '';
  @Output() modelChange = new EventEmitter<string>();
}