import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenRefreshService } from '@core/services/token-refresh';

/**
 * Token Refresh Interceptor
 *
 * Intercepta errores 401 y automáticamente intenta refrescar el token.
 * Usa TokenRefreshService para gestionar el estado del refresh con signals.
 * Maneja múltiples requests simultáneos esperando el mismo refresh.
 */
export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenRefreshService = inject(TokenRefreshService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // ✅ Solo interceptar errores 401 (Unauthorized)
            if (error.status !== 401) {
                return throwError(() => error);
            }

            // ✅ No intentar refresh en endpoints de auth
            if (
                req.url.includes('/auth/login') ||
                req.url.includes('/auth/refresh') ||
                req.url.includes('/auth/logout')
            ) {
                return throwError(() => error);
            }

            // ✅ Si ya está refrescando, esperar al resultado
            if (tokenRefreshService.isRefreshing()) {
                return tokenRefreshService.waitForTokenRefresh().pipe(
                    switchMap((newToken) => {
                        const clonedReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${newToken}`,
                            },
                        });
                        return next(clonedReq);
                    }),
                    catchError(() => throwError(() => error))
                );
            }

            // ✅ Iniciar proceso de refresh
            return tokenRefreshService.refreshAccessToken().pipe(
                switchMap((response) => {
                    if (response && response.access_token) {
                        // ✅ Reintentar request original con nuevo token
                        const clonedReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${response.access_token}`,
                            },
                        });
                        return next(clonedReq);
                    }

                    // ❌ Refresh falló, propagar error
                    return throwError(() => error);
                }),
                catchError((refreshError) => {
                    // ❌ Error en refresh, propagar para que errorInterceptor maneje el logout
                    return throwError(() => refreshError);
                })
            );
        })
    );
};
