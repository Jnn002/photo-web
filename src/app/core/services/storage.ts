import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { UserPublic } from '@generated/types';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly TOKEN_KEY = environment.tokenKey;
    private readonly REFRESH_TOKEN_KEY = environment.refreshTokenKey;
    private readonly USER_KEY = 'current_user';

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

    clearAuth(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }
}
