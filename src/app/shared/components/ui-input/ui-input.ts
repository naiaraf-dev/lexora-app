import { Component, EventEmitter, Input, Output } from '@angular/core';
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
}