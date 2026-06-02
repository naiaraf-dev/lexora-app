import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [RouterOutlet, Topbar],
  templateUrl: './page-layout.html',
})
export class PageLayout {}
