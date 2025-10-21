import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '@core/services/auth';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Token Refresh Interceptor
 *
 * Intercepta errores 401 y automáticamente intenta refrescar el token.
 * Maneja múltiples requests simultáneos esperando el mismo refresh.
 */
export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Solo interceptar errores 401 (Unauthorized)
            if (error.status !== 401) {
                return throwError(() => error);
            }

            // No intentar refresh en endpoints de auth
            if (
                req.url.includes('/auth/login') ||
                req.url.includes('/auth/refresh') ||
                req.url.includes('/auth/logout')
            ) {
                return throwError(() => error);
            }

            // Si ya está refrescando, esperar al resultado
            if (isRefreshing) {
                return refreshTokenSubject.pipe(
                    filter((token) => token !== null),
                    take(1),
                    switchMap((token) => {
                        const clonedReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        return next(clonedReq);
                    })
                );
            }

            // Iniciar proceso de refresh
            isRefreshing = true;
            refreshTokenSubject.next(null);

            return authService.refreshToken().pipe(
                switchMap((response) => {
                    isRefreshing = false;

                    if (response && response.access_token) {
                        // Notificar a otros requests esperando
                        refreshTokenSubject.next(response.access_token);

                        // Reintentar request original con nuevo token
                        const clonedReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${response.access_token}`,
                            },
                        });
                        return next(clonedReq);
                    }

                    // Refresh falló, propagar error
                    return throwError(() => error);
                }),
                catchError((refreshError) => {
                    isRefreshing = false;
                    refreshTokenSubject.next(null);

                    // El errorInterceptor manejará el logout
                    return throwError(() => refreshError);
                })
            );
        })
    );
};
