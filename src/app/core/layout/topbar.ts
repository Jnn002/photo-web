import { Component, ChangeDetectionStrategy, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, ButtonModule, AvatarModule, MenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class TopbarComponent {
  readonly menuToggle = output<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly userMenuItems: MenuItem[] = [
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/profile'])
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      command: () => this.router.navigate(['/settings'])
    },
    {
      separator: true
    },
    {
      label: 'Cerrar Sesión',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  logout(): void {
    // AuthService.logout() ya maneja la navegación
    this.authService.logout();
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';

    // Usar nombre completo si está disponible
    if (user.full_name) {
      const names = user.full_name.trim().split(' ');
      if (names.length >= 2) {
        // Primera letra del nombre y apellido
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }

    // Fallback a email
    return user.email?.charAt(0).toUpperCase() || 'U';
  }
}
