import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, of } from 'rxjs';
import { environment } from '@environments/environment';
import { StorageService } from './storage';
import type {
  UserLogin,
  TokenResponse,
  UserPublic
} from '@generated/types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ Use inject() instead of constructor
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  // ✅ Private writable signals
  private readonly _currentUser = signal<UserPublic | null>(null);
  private readonly _isAuthenticated = signal(false);

  // ✅ Public readonly signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  // ✅ Computed signals for derived state
  readonly userRoles = computed(() => this._currentUser()?.roles ?? []);
  readonly userName = computed(() => this._currentUser()?.full_name || this._currentUser()?.email || '');
  readonly userEmail = computed(() => this._currentUser()?.email ?? '');
  readonly isAdmin = computed(() =>
    this.userRoles().some(role => role.name === 'Admin')
  );

  // ✅ Use effect for initialization
  constructor() {
    effect(() => {
      this.initializeAuth();
    }, { allowSignalWrites: true });
  }

  private initializeAuth(): void {
    const token = this.storage.getAccessToken();
    const user = this.storage.getCurrentUser();

    if (token && user) {
      this._currentUser.set(user);
      this._isAuthenticated.set(true);
    }
  }

  login(credentials: UserLogin) {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.handleAuthSuccess(response);
        }),
        catchError(error => {
          console.error('Login failed:', error);
          throw error;
        })
      );
  }

  refreshToken() {
    const refreshToken = this.storage.getRefreshToken();

    if (!refreshToken) {
      this.logout();
      return of(null);
    }

    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
        refresh_token: refreshToken
      })
      .pipe(
        tap(response => {
          this.handleAuthSuccess(response);
        }),
        catchError(() => {
          this.logout();
          return of(null);
        })
      );
  }

  logout(): void {
    const refreshToken = this.storage.getRefreshToken();

    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refresh_token: refreshToken })
        .subscribe();
    }

    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  private handleAuthSuccess(response: TokenResponse): void {
    this.storage.setAccessToken(response.access_token);
    this.storage.setRefreshToken(response.refresh_token);
    this.storage.setCurrentUser(response.user);

    this._currentUser.set(response.user);
    this._isAuthenticated.set(true);
  }

  private clearAuth(): void {
    this.storage.clearAuth();
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }

  hasPermission(permission: string): boolean {
    const user = this._currentUser();
    if (!user?.roles) return false;

    return user.roles.some(role =>
      role.permissions?.some(p => p.code === permission)
    );
  }

  hasRole(roleName: string): boolean {
    const roles = this.userRoles();
    return roles.some(role => role.name === roleName);
  }
}
