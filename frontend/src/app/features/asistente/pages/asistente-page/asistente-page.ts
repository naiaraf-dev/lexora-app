import { Component } from '@angular/core';
import { AsistenteChat } from '../../components/asistente-chat/asistente-chat';

@Component({
  selector: 'app-asistente-page',
  standalone: true,
  imports: [AsistenteChat],
  templateUrl: './asistente-page.html',
})
export class AsistentePage {}