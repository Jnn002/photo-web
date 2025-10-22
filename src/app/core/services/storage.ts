import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { UserPublic, UserWithRoles } from '@generated/types';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly TOKEN_KEY = environment.tokenKey;
    private readonly REFRESH_TOKEN_KEY = environment.refreshTokenKey;
    private readonly USER_KEY = 'current_user';
    private readonly USER_WITH_ROLES_KEY = 'user_with_roles';
    private readonly PERMISSIONS_KEY = 'user_permissions';

    getAccessToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    setAccessToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    setRefreshToken(token: string): void {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }

    getCurrentUser(): UserPublic | null {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? (JSON.parse(user) as UserPublic) : null;
    }

    setCurrentUser(user: UserPublic): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    getUserWithRoles(): UserWithRoles | null {
        const user = localStorage.getItem(this.USER_WITH_ROLES_KEY);
        return user ? (JSON.parse(user) as UserWithRoles) : null;
    }

    setUserWithRoles(user: UserWithRoles): void {
        localStorage.setItem(this.USER_WITH_ROLES_KEY, JSON.stringify(user));
    }

    getPermissions(): string[] {
        const permissions = localStorage.getItem(this.PERMISSIONS_KEY);
        return permissions ? (JSON.parse(permissions) as string[]) : [];
    }

    setPermissions(permissions: string[]): void {
        localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
    }

    clearAuth(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.USER_WITH_ROLES_KEY);
        localStorage.removeItem(this.PERMISSIONS_KEY);
    }
}
