import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth';

/**
 * Permission Guard
 *
 * Protege rutas basándose en permisos específicos del usuario.
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'users',
 *   canActivate: [permissionGuard],
 *   data: { permission: 'user.list' },
 *   loadComponent: () => import('./users')
 * }
 * ```
 *
 * Para múltiples permisos (requiere todos):
 * ```typescript
 * data: { permissions: ['user.create', 'user.edit'] }
 * ```
 *
 * Para múltiples permisos (requiere al menos uno):
 * ```typescript
 * data: { anyPermission: ['user.view', 'user.list'] }
 * ```
 */
export const permissionGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar autenticación primero
    if (!authService.isAuthenticated()) {
        router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url },
        });
        return false;
    }

    // Verificar permiso único
    const requiredPermission = route.data['permission'] as string | undefined;
    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
        router.navigate(['/unauthorized']);
        return false;
    }

    // Verificar múltiples permisos (requiere todos)
    const requiredPermissions = route.data['permissions'] as string[] | undefined;
    if (requiredPermissions && !authService.hasAllPermissions(requiredPermissions)) {
        router.navigate(['/unauthorized']);
        return false;
    }

    // Verificar múltiples permisos (requiere al menos uno)
    const anyPermission = route.data['anyPermission'] as string[] | undefined;
    if (anyPermission && !authService.hasAnyPermission(anyPermission)) {
        router.navigate(['/unauthorized']);
        return false;
    }

    return true;
};
