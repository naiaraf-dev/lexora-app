import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ui-select.html',
})
export class UiSelect {
  @Input() label = '';
  @Input() options: { label: string; value: string }[] = [];
  @Input() model: any;
  @Output() modelChange = new EventEmitter<any>();
}