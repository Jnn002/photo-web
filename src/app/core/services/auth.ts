import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, of, forkJoin, Subject, takeUntil } from 'rxjs';
import { environment } from '@environments/environment';
import { StorageService } from './storage';
import { TokenRefreshService } from './token-refresh';
import { TokenStorageService } from './token-storage';
import { TokenRefreshSchedulerService } from './token-refresh-scheduler';
import { SessionTimeoutService } from './session-timeout';
import { LoggingService } from './logging';
import { NotificationService } from './notification';
import { isTokenValid } from '@core/utils/jwt.utils';
import { SECURITY_EVENTS } from '@core/constants/security.constants';
import type { UserLogin, TokenResponse, UserPublic, UserWithRoles } from '@generated/types.gen';

/**
 * REFACTORED AuthService
 *
 * SECURITY IMPROVEMENTS:
 * - Integrated TokenStorageService for secure token management
 * - Integrated TokenRefreshSchedulerService for proactive token refresh
 * - Integrated SessionTimeoutService for session warnings
 * - Integrated LoggingService for secure logging
 * - Sensitive data (roles, permissions) now stored in memory signals only
 * - Proper cleanup on logout (cancel requests, timers)
 * - Security event logging for audit trail
 */
@Injectable({
    providedIn: 'root',
})
export class AuthService {
    // ✅ Use inject() instead of constructor
    private readonly http = inject(HttpClient);
    private readonly storage = inject(StorageService);
    private readonly router = inject(Router);
    private readonly tokenRefreshService = inject(TokenRefreshService);
    private readonly tokenStorage = inject(TokenStorageService);
    private readonly refreshScheduler = inject(TokenRefreshSchedulerService);
    private readonly sessionTimeout = inject(SessionTimeoutService);
    private readonly logger = inject(LoggingService);
    private readonly notification = inject(NotificationService);

    // Subject for cancelling in-flight requests on logout
    private readonly destroy$ = new Subject<void>();

    // ✅ Private writable signals - SECURITY: Data now stays in memory only
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
        this.setupSessionManagement();
    }

    /**
     * Setup session management listeners
     * Handles session expiration warnings and extension requests
     */
    private setupSessionManagement(): void {
        // Listen for session expiration warning
        this.sessionTimeout.onSessionExpiring.subscribe((warning) => {
            this.logger.security(SECURITY_EVENTS.SESSION_TIMEOUT_WARNING, {
                minutesRemaining: warning.minutesRemaining,
                expiresAt: warning.expiresAt.toISOString(),
            });
        });

        // Listen for session expiration
        this.sessionTimeout.onSessionExpired.subscribe(() => {
            this.logger.security(SECURITY_EVENTS.TOKEN_EXPIRED);
            this.logout();
        });

        // Listen for session extension request
        this.sessionTimeout.onSessionExtended.subscribe(() => {
            this.refreshToken().subscribe();
        });

        // Listen for scheduled token refresh
        this.refreshScheduler.onRefreshNeeded.subscribe(() => {
            this.logger.debug('Proactive token refresh triggered');
            this.refreshToken().subscribe();
        });
    }

    /**
     * Inicializa el estado de autenticación desde storage
     * Se ejecuta síncronamente al crear el servicio para garantizar
     * que el estado esté disponible antes del routing
     *
     * SECURITY IMPROVEMENT: Roles/permissions no longer loaded from storage
     * They must be fetched fresh from backend
     */
    private initializeAuth(): void {
        const token = this.tokenStorage.getAccessToken();
        const user = this.storage.getCurrentUser();

        // Validar que existe token, usuario y que el token no haya expirado
        if (token && user && isTokenValid(token)) {
            this._currentUser.set(user);
            this._isAuthenticated.set(true);

            this.logger.debug('Auth initialized from storage');

            // Start session monitoring
            this.sessionTimeout.startMonitoring(token);
            this.refreshScheduler.scheduleTokenRefresh(token);

            // Refrescar roles/permisos en segundo plano (lazy)
            // SECURITY: Always fetch fresh from backend, never from localStorage
            setTimeout(() => {
                this.loadUserRolesAndPermissions().subscribe();
            }, 0);
        } else if (token || user) {
            // Si hay datos pero el token expiró, limpiar storage
            this.logger.warn('Token expired or invalid, clearing auth data');
            this.storage.clearAuth();
            this.logger.security(SECURITY_EVENTS.TOKEN_EXPIRED);
        }
    }

    /**
     * Load user roles and permissions from backend
     * SECURITY: Data is stored ONLY in memory signals, never in localStorage
     */
    private loadUserRolesAndPermissions() {
        return forkJoin({
            userWithRoles: this.http.get<UserWithRoles>(`${environment.apiUrl}/users/me`),
            permissions: this.http.get<string[]>(`${environment.apiUrl}/users/me/permissions`),
        }).pipe(
            takeUntil(this.destroy$), // Cancel on logout
            tap(({ userWithRoles, permissions }) => {
                // SECURITY: Store only in memory
                this._userWithRoles.set(userWithRoles);
                this._permissions.set(permissions);

                this.logger.debug('User roles and permissions loaded');
            }),
            catchError((error) => {
                this.logger.error('Failed to load user roles/permissions', error);
                return of({ userWithRoles: null, permissions: [] });
            })
        );
    }

    login(credentials: UserLogin) {
        return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
            tap((response) => {
                this.handleAuthSuccess(response);
                this.logger.security(SECURITY_EVENTS.LOGIN_SUCCESS, {
                    email: credentials.email,
                    timestamp: new Date().toISOString(),
                });
            }),
            catchError((error) => {
                this.logger.security(SECURITY_EVENTS.LOGIN_FAILED, {
                    email: credentials.email,
                    error: error?.status || 'unknown',
                });
                this.logger.error('Login failed', error);
                throw error;
            })
        );
    }

    /**
     * Delega al TokenRefreshService para refrescar el token
     * El TokenRefreshService gestiona el estado y evita múltiples refreshes simultáneos
     *
     * SECURITY IMPROVEMENT: Reschedule timers after successful refresh
     */
    refreshToken() {
        return this.tokenRefreshService.refreshAccessToken().pipe(
            tap((response) => {
                if (response) {
                    // Reschedule session monitoring and auto-refresh with new token
                    this.sessionTimeout.reschedule(response.access_token);
                    this.refreshScheduler.reschedule(response.access_token);

                    this.logger.security(SECURITY_EVENTS.TOKEN_REFRESH_SUCCESS);
                }
            }),
            catchError((error) => {
                this.logger.security(SECURITY_EVENTS.TOKEN_REFRESH_FAILED, {
                    error: error?.status || 'unknown',
                });
                this.logger.error('Token refresh failed', error);
                this.logout();
                return of(null);
            })
        );
    }

    /**
     * Logout user
     * SECURITY IMPROVEMENTS:
     * - Cancels all in-flight HTTP requests
     * - Stops all timers (session, refresh)
     * - Cleans up all resources
     * - Logs security event
     */
    logout(): void {
        const refreshToken = this.tokenStorage.getRefreshToken();

        this.logger.debug('Logout initiated');

        // Cancel all in-flight requests
        this.destroy$.next();

        // Stop session monitoring and refresh scheduling
        this.sessionTimeout.stopMonitoring();
        this.refreshScheduler.cancelScheduledRefresh();

        // Si hay token, intentar revocar en backend ANTES de limpiar estado local
        if (refreshToken) {
            this.http
                .post(`${environment.apiUrl}/auth/logout`, { refresh_token: refreshToken })
                .pipe(
                    catchError((error) => {
                        // Ignorar errores de logout en backend
                        this.logger.warn('Backend logout failed, proceeding with local cleanup');
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

        this.logger.security(SECURITY_EVENTS.LOGOUT, {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Handle successful authentication
     * SECURITY IMPROVEMENTS:
     * - Start session monitoring
     * - Schedule proactive token refresh
     * - Load fresh roles/permissions
     */
    private handleAuthSuccess(response: TokenResponse): void {
        // Store tokens via TokenStorageService (through StorageService for now)
        this.tokenStorage.setAccessToken(response.access_token);
        this.tokenStorage.setRefreshToken(response.refresh_token);
        this.storage.setCurrentUser(response.user);

        this._currentUser.set(response.user);
        this._isAuthenticated.set(true);

        // Start session monitoring and auto-refresh
        this.sessionTimeout.startMonitoring(response.access_token);
        this.refreshScheduler.scheduleTokenRefresh(response.access_token);

        // Cargar roles y permisos inmediatamente después del login
        this.loadUserRolesAndPermissions().subscribe();

        this.logger.debug('Auth success handled, session monitoring started');
    }

    /**
     * Clear authentication state
     * SECURITY IMPROVEMENTS:
     * - Cleanup all timers and subscriptions
     * - Clear sensitive data from memory
     * - Reset all services
     */
    private clearAuth(): void {
        this.storage.clearAuth();
        this._currentUser.set(null);
        this._userWithRoles.set(null);
        this._permissions.set([]);
        this._isAuthenticated.set(false);

        // ✅ Resetear estado del refresh token
        this.tokenRefreshService.resetState();

        // Cleanup timers and subscriptions
        this.sessionTimeout.cleanup();
        this.refreshScheduler.cleanup();

        this.logger.debug('Auth state cleared');
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
