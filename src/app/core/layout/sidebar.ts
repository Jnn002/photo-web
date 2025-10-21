import { Component, ChangeDetectionStrategy, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  section?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  readonly collapsed = input(false);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly mainMenuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
    { label: 'Sesiones', icon: 'pi pi-calendar', route: '/sessions' },
    { label: 'Mis Sesiones', icon: 'pi pi-camera', route: '/my-sessions' },
    { label: 'Clientes', icon: 'pi pi-users', route: '/clients' }
  ];

  readonly catalogMenuItems: MenuItem[] = [
    { label: 'Items', icon: 'pi pi-box', route: '/items', section: 'CATÁLOGO' },
    { label: 'Paquetes', icon: 'pi pi-gift', route: '/packages', section: 'CATÁLOGO' },
    { label: 'Salas', icon: 'pi pi-building', route: '/rooms', section: 'CATÁLOGO' }
  ];

  readonly systemMenuItems: MenuItem[] = [
    { label: 'Usuarios', icon: 'pi pi-user', route: '/users', section: 'SISTEMA' },
    { label: 'Reportes', icon: 'pi pi-chart-line', route: '/reports', section: 'SISTEMA' }
  ];

  readonly currentUser = computed(() => this.authService.currentUser());

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
