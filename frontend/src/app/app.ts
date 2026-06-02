import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Librería para toasts de Angular, se instala con: npm install ngx-sonner
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxSonnerToaster], // NgxSonnerToaster puede tirar error fantasma después de instalación, se ignora. Chequear que esté en package.json y package-lock.json
  templateUrl: './app.html',
})
export class App {}
