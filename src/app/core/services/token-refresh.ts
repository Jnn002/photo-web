import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, catchError, tap, switchMap, filter, take } from 'rxjs';
import { environment } from '@environments/environment';
import { StorageService } from './storage';
import type { TokenResponse } from '@generated/types.gen';

/**
 * Token Refresh Service
 * 
 * Gestiona el estado del refresh token usando signals de Angular 20+.
 * Garantiza que solo se ejecute un refresh a la vez y coordina múltiples requests.
 */
@Injectable({
    providedIn: 'root',
})
export class TokenRefreshService {
    private readonly http = inject(HttpClient);
    private readonly storage = inject(StorageService);

    // ✅ Signal para estado de refresh (privado)
    private readonly _isRefreshing = signal(false);
    
    // ✅ BehaviorSubject para coordinar múltiples requests esperando el mismo refresh
    private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

    // ✅ Public readonly signal
    readonly isRefreshing = this._isRefreshing.asReadonly();

    /**
     * Ejecuta el refresh del access token usando el refresh token almacenado
     * Garantiza que solo se ejecute un refresh a la vez
     */
    refreshAccessToken(): Observable<TokenResponse | null> {
        const refreshToken = this.storage.getRefreshToken();

        if (!refreshToken) {
            console.warn('No refresh token available');
            return throwError(() => new Error('No refresh token'));
        }

        // Marcar que estamos refrescando
        this._isRefreshing.set(true);
        this.refreshTokenSubject.next(null);

        return this.http
            .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
                refresh_token: refreshToken,
            })
            .pipe(
                tap((response) => {
                    // ✅ Actualizar tokens en storage
                    this.storage.setAccessToken(response.access_token);
                    this.storage.setRefreshToken(response.refresh_token);

                    // ✅ Notificar a requests esperando
                    this.refreshTokenSubject.next(response.access_token);
                    
                    // ✅ Resetear estado
                    this._isRefreshing.set(false);

                    console.log('Token refreshed successfully');
                }),
                catchError((error) => {
                    console.error('Token refresh failed:', error);
                    
                    // ✅ Resetear estado
                    this._isRefreshing.set(false);
                    this.refreshTokenSubject.next(null);
                    
                    return throwError(() => error);
                })
            );
    }

    /**
     * Espera a que el refresh en progreso se complete y devuelve el nuevo token
     * Usado por requests que llegan mientras ya hay un refresh en curso
     */
    waitForTokenRefresh(): Observable<string> {
        return this.refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
                if (!token) {
                    return throwError(() => new Error('Token refresh failed'));
                }
                return new Observable<string>((observer) => {
                    observer.next(token);
                    observer.complete();
                });
            })
        );
    }

    /**
     * Resetea el estado del refresh (útil para testing o logout)
     */
    resetState(): void {
        this._isRefreshing.set(false);
        this.refreshTokenSubject.next(null);
    }
}
