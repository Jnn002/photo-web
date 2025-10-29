import { Component, ChangeDetectionStrategy, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  section?: string;
  permission?: string; // Required permission to view this item
  anyPermission?: string[]; // At least one of these permissions required
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

  // All available menu items with permission requirements
  private readonly allMainMenuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
    {
      label: 'Sesiones',
      icon: 'pi pi-calendar',
      route: '/sessions',
      permission: 'session.view.all' // Only admins/coordinators
    },
    {
      label: 'Mis Sesiones',
      icon: 'pi pi-camera',
      route: '/my-sessions',
      permission: 'session.view.own' // Photographers
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      route: '/clients',
      anyPermission: ['client.view', 'client.create', 'client.edit'] // Any client permission
    }
  ];

  private readonly allCatalogMenuItems: MenuItem[] = [
    {
      label: 'Items',
      icon: 'pi pi-camera',
      route: '/items',
      section: 'CATÁLOGO',
      anyPermission: ['item.view', 'item.create', 'item.edit']
    },
    {
      label: 'Paquetes',
      icon: 'pi pi-box',
      route: '/packages',
      section: 'CATÁLOGO',
      anyPermission: ['package.view', 'package.create', 'package.edit']
    },
    {
      label: 'Salas',
      icon: 'pi pi-building',
      route: '/rooms',
      section: 'CATÁLOGO',
      anyPermission: ['room.view', 'room.create', 'room.edit']
    }
  ];

  private readonly allSystemMenuItems: MenuItem[] = [
    {
      label: 'Usuarios',
      icon: 'pi pi-user',
      route: '/users',
      section: 'SISTEMA',
      anyPermission: ['user.list', 'user.create', 'user.edit']
    },
    {
      label: 'Reportes',
      icon: 'pi pi-chart-line',
      route: '/reports',
      section: 'SISTEMA',
      permission: 'reports.view' // Future permission
    }
  ];

  readonly currentUser = computed(() => this.authService.currentUser());

  /**
   * Filtered main menu items based on user permissions
   */
  readonly mainMenuItems = computed(() => this.filterMenuItems(this.allMainMenuItems));

  /**
   * Filtered catalog menu items based on user permissions
   */
  readonly catalogMenuItems = computed(() => this.filterMenuItems(this.allCatalogMenuItems));

  /**
   * Filtered system menu items based on user permissions
   */
  readonly systemMenuItems = computed(() => this.filterMenuItems(this.allSystemMenuItems));

  /**
   * Helper to filter menu items based on permissions
   */
  private filterMenuItems(items: MenuItem[]): MenuItem[] {
    return items.filter(item => {
      // If no permission requirement, show it
      if (!item.permission && !item.anyPermission) {
        return true;
      }

      // Check single permission
      if (item.permission) {
        return this.authService.hasPermission(item.permission);
      }

      // Check any permission
      if (item.anyPermission) {
        return this.authService.hasAnyPermission(item.anyPermission);
      }

      return false;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
