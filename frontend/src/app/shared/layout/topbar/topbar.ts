import { Component, signal, computed, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.html',
})
export class Topbar {
  private authService = inject(Auth);

  dropdownOpen = signal(false);
  darkMode     = signal(false);

  get user() {
    const u = this.authService.currentUser();
    if (!u) return { name: 'Usuario', email: '', avatarUrl: '' };
    const name = u.apellido ? `${u.nombre} ${u.apellido}` : u.nombre;
    return { name, email: u.email, avatarUrl: '' };
  }

  constructor(private elRef: ElementRef) {
    const saved = localStorage.getItem('lexora-theme');
    if (saved === 'dark') {
      this.darkMode.set(true);
      document.documentElement.classList.add('dark');
    }
  }

  toggleDropdown() { this.dropdownOpen.set(!this.dropdownOpen()); }
  toggleDarkMode() {
    this.darkMode.set(!this.darkMode());
    if (this.darkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lexora-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lexora-theme', 'light');
    }
  }
  closeDropdown()   { this.dropdownOpen.set(false); }

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
    this.authService.logout();
  }
}
