import { Component, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.html',
})
export class Topbar {
  dropdownOpen = signal(false);
  darkMode = signal(false);

  // Usuario mock — reemplazar con servicio de auth
  user = {
    name: 'John Smith',
    email: 'john@practical-ui.com',
    avatarUrl: '', // se llenará desde el perfil del usuario
  };

  constructor(private elRef: ElementRef) {}

  toggleDropdown() {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  toggleDarkMode() {
    this.darkMode.set(!this.darkMode());
  }

  closeDropdown() {
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  get userInitials(): string {
    return this.user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  onLogout() {
    this.dropdownOpen.set(false);
    // lógica de logout acá
  }
}
