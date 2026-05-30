import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  templateUrl: './auth-card.html',
})
export class AuthCard {
  @Input() title = '';
  @Input() subtitle = '';
}