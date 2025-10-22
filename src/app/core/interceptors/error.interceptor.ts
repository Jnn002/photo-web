import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth';
import { NotificationService } from '@core/services/notification';
import { TokenRefreshService } from '@core/services/token-refresh';

/**
 * Error Interceptor
 *
 * Maneja errores HTTP globales y muestra notificaciones al usuario.
 * NO maneja errores 401 de requests normales (eso lo hace tokenRefreshInterceptor).
 * SOLO maneja errores 401 del endpoint /auth/refresh (refresh token expirado).
 * HACE logout automático cuando se alcanzan límites de intentos.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ❌ Si se alcanzó el límite de intentos de refresh, hacer logout inmediato
      if (tokenRefreshService.failedAttempts() >= 2) {
        console.error('Refresh attempts limit exceeded. Forcing logout.');
        authService.logout();
        notificationService.showError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return throwError(() => error);
      }

      let errorMessage = 'An error occurred';
      let shouldShowError = true;

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            // ✅ SOLO hacer logout si el refresh token ha fallado
            if (req.url.includes('/auth/refresh')) {
              authService.logout();
              errorMessage = 'Session expired. Please login again.';
            } else {
              // ❌ NO mostrar error ni hacer logout
              // El tokenRefreshInterceptor está manejando este 401
              shouldShowError = false;
            }
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 422:
            errorMessage = error.error.detail || 'Validation error';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = error.error?.detail || error.message;
        }
      }

      // ✅ Solo mostrar error si no es un 401 que está siendo manejado por tokenRefreshInterceptor
      if (shouldShowError) {
        notificationService.showError(errorMessage);
      }
      
      return throwError(() => error);
    })
  );
};
