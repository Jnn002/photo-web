import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, of, forkJoin } from 'rxjs';
import { environment } from '@environments/environment';
import { StorageService } from './storage';
import { TokenRefreshService } from './token-refresh';
import { isTokenValid } from '@core/utils/jwt.utils';
import type { UserLogin, TokenResponse, UserPublic, UserWithRoles } from '@generated/types.gen';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    // ✅ Use inject() instead of constructor
    private readonly http = inject(HttpClient);
    private readonly storage = inject(StorageService);
    private readonly router = inject(Router);
    private readonly tokenRefreshService = inject(TokenRefreshService);

    // ✅ Private writable signals
    private readonly _currentUser = signal<UserPublic | null>(null);
    private readonly _userWithRoles = signal<UserWithRoles | null>(null);
    private readonly _permissions = signal<string[]>([]);
    private readonly _isAuthenticated = signal(false);

    // ✅ Public readonly signals
    readonly currentUser = this._currentUser.asReadonly();
    readonly userWithRoles = this._userWithRoles.asReadonly();
    readonly permissions = this._permissions.asReadonly();
    readonly isAuthenticated = this._isAuthenticated.asReadonly();

    // ✅ Computed signals for derived state
    readonly userName = computed(
        () => this._currentUser()?.full_name || this._currentUser()?.email || ''
    );
    readonly userEmail = computed(() => this._currentUser()?.email ?? '');
    readonly userRoles = computed(() => this._userWithRoles()?.roles ?? []);
    readonly isAdmin = computed(() =>
        this.userRoles().some((role: { name: string }) => role.name === 'Admin')
    );

    // ✅ Inicialización síncrona en el constructor
    constructor() {
        this.initializeAuth();
    }

    /**
     * Inicializa el estado de autenticación desde localStorage
     * Se ejecuta síncronamente al crear el servicio para garantizar
     * que el estado esté disponible antes del routing
     */
    private initializeAuth(): void {
        const token = this.storage.getAccessToken();
        const user = this.storage.getCurrentUser();

        // Validar que existe token, usuario y que el token no haya expirado
        if (token && user && isTokenValid(token)) {
            this._currentUser.set(user);
            this._isAuthenticated.set(true);

            // Cargar roles/permisos desde localStorage (sin HTTP)
            const userWithRoles = this.storage.getUserWithRoles();
            const permissions = this.storage.getPermissions();

            if (userWithRoles) {
                this._userWithRoles.set(userWithRoles);
            }

            if (permissions.length > 0) {
                this._permissions.set(permissions);
            }

            // Refrescar roles/permisos en segundo plano (lazy)
            // Se hace después de que la app ya esté inicializada
            setTimeout(() => {
                this.loadUserRolesAndPermissions().subscribe();
            }, 0);
        } else if (token || user) {
            // Si hay datos pero el token expiró, limpiar localStorage
            console.warn('Token expired or invalid, clearing auth data');
            this.storage.clearAuth();
        }
    }

    private loadUserRolesAndPermissions() {
        return forkJoin({
            userWithRoles: this.http.get<UserWithRoles>(`${environment.apiUrl}/users/me`),
            permissions: this.http.get<string[]>(`${environment.apiUrl}/users/me/permissions`),
        }).pipe(
            tap(({ userWithRoles, permissions }) => {
                this._userWithRoles.set(userWithRoles);
                this._permissions.set(permissions);

                // Persistir en localStorage para próxima sesión
                this.storage.setUserWithRoles(userWithRoles);
                this.storage.setPermissions(permissions);
            }),
            catchError((error) => {
                console.error('Failed to load user roles/permissions:', error);
                return of({ userWithRoles: null, permissions: [] });
            })
        );
    }

    login(credentials: UserLogin) {
        return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
            tap((response) => {
                this.handleAuthSuccess(response);
            }),
            catchError((error) => {
                console.error('Login failed:', error);
                throw error;
            })
        );
    }

    /**
     * Delega al TokenRefreshService para refrescar el token
     * El TokenRefreshService gestiona el estado y evita múltiples refreshes simultáneos
     */
    refreshToken() {
        return this.tokenRefreshService.refreshAccessToken().pipe(
            catchError((error) => {
                console.error('Token refresh failed:', error);
                this.logout();
                return of(null);
            })
        );
    }

    logout(): void {
        const refreshToken = this.storage.getRefreshToken();

        // Si hay token, intentar revocar en backend ANTES de limpiar estado local
        if (refreshToken) {
            this.http
                .post(`${environment.apiUrl}/auth/logout`, { refresh_token: refreshToken })
                .pipe(
                    catchError((error) => {
                        // Ignorar errores de logout en backend
                        console.warn('Backend logout failed:', error);
                        return of(null);
                    })
                )
                .subscribe(() => {
                    // Limpiar estado local después de logout en backend (éxito o fallo)
                    this.clearAuth();
                    this.router.navigate(['/auth/login']);
                });
        } else {
            // Si no hay refresh token, solo limpiar estado local
            this.clearAuth();
            this.router.navigate(['/auth/login']);
        }
    }

    private handleAuthSuccess(response: TokenResponse): void {
        this.storage.setAccessToken(response.access_token);
        this.storage.setRefreshToken(response.refresh_token);
        this.storage.setCurrentUser(response.user);

        this._currentUser.set(response.user);
        this._isAuthenticated.set(true);

        // Cargar roles y permisos inmediatamente después del login
        this.loadUserRolesAndPermissions().subscribe();
    }

    private clearAuth(): void {
        this.storage.clearAuth();
        this._currentUser.set(null);
        this._userWithRoles.set(null);
        this._permissions.set([]);
        this._isAuthenticated.set(false);
        
        // ✅ Resetear estado del refresh token
        this.tokenRefreshService.resetState();
    }

    hasPermission(permission: string): boolean {
        return this._permissions().includes(permission);
    }

    hasRole(roleName: string): boolean {
        const roles = this.userRoles();
        return roles.some((role: { name: string }) => role.name === roleName);
    }

    hasAnyPermission(permissions: string[]): boolean {
        const userPermissions = this._permissions();
        return permissions.some((permission) => userPermissions.includes(permission));
    }

    hasAllPermissions(permissions: string[]): boolean {
        const userPermissions = this._permissions();
        return permissions.every((permission) => userPermissions.includes(permission));
    }
}
