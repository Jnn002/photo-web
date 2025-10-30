import { Injectable, inject } from '@angular/core';
import { STORAGE_KEYS } from '@core/constants/security.constants';
import type { UserPublic } from '@generated/types.gen';
import { TokenStorageService } from './token-storage';
import { LoggingService } from './logging';

/**
 * REFACTORED StorageService
 *
 * SECURITY IMPROVEMENTS:
 * - Token management delegated to TokenStorageService
 * - Removed sensitive data from localStorage (UserWithRoles, Permissions)
 * - These will now be stored in memory in AuthService signals
 * - Only non-sensitive user info (id, email) kept in sessionStorage
 * - Added logging for debugging
 *
 * MIGRATION NOTES:
 * - Old methods kept for backwards compatibility but deprecated
 * - Will be removed in future version
 * - AuthService now manages sensitive data in memory
 */
@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly tokenStorage = inject(TokenStorageService);
    private readonly logger = inject(LoggingService);

    private readonly USER_KEY = 'current_user'; // Only basic user info

    // ========================================
    // TOKEN METHODS - DELEGATED TO TokenStorageService
    // ========================================

    /**
     * Get access token
     * @deprecated Use TokenStorageService directly
     */
    getAccessToken(): string | null {
        return this.tokenStorage.getAccessToken();
    }

    /**
     * Set access token
     * @deprecated Use TokenStorageService directly
     */
    setAccessToken(token: string): void {
        this.tokenStorage.setAccessToken(token);
    }

    /**
     * Get refresh token
     * @deprecated Use TokenStorageService directly
     */
    getRefreshToken(): string | null {
        return this.tokenStorage.getRefreshToken();
    }

    /**
     * Set refresh token
     * @deprecated Use TokenStorageService directly
     */
    setRefreshToken(token: string): void {
        this.tokenStorage.setRefreshToken(token);
    }

    // ========================================
    // USER DATA METHODS - MINIMAL DATA ONLY
    // ========================================

    /**
     * Get current user (basic info only)
     * Only stores non-sensitive data: id, email, full_name
     */
    getCurrentUser(): UserPublic | null {
        const user = sessionStorage.getItem(this.USER_KEY);
        return user ? (JSON.parse(user) as UserPublic) : null;
    }

    /**
     * Set current user (basic info only)
     * Stores in sessionStorage (cleared on tab close)
     */
    setCurrentUser(user: UserPublic): void {
        // Only store basic, non-sensitive info
        const basicUser: UserPublic = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        sessionStorage.setItem(this.USER_KEY, JSON.stringify(basicUser));
        this.logger.debug('User basic info stored in sessionStorage');
    }

    // ========================================
    // DEPRECATED METHODS - FOR BACKWARDS COMPATIBILITY
    // These will be removed in future versions
    // Data now managed in AuthService memory signals
    // ========================================

    /**
     * @deprecated This data is now stored in AuthService signals (memory only)
     * Returns null, data should be fetched from AuthService
     */
    getUserWithRoles(): null {
        this.logger.warn('getUserWithRoles is deprecated. Use AuthService.currentUser signal instead');
        return null;
    }

    /**
     * @deprecated This data is now stored in AuthService signals (memory only)
     * No-op method for backwards compatibility
     */
    setUserWithRoles(): void {
        this.logger.warn('setUserWithRoles is deprecated. Data is managed in AuthService memory');
    }

    /**
     * @deprecated This data is now stored in AuthService signals (memory only)
     * Returns empty array, data should be fetched from AuthService
     */
    getPermissions(): string[] {
        this.logger.warn('getPermissions is deprecated. Use AuthService.permissions signal instead');
        return [];
    }

    /**
     * @deprecated This data is now stored in AuthService signals (memory only)
     * No-op method for backwards compatibility
     */
    setPermissions(): void {
        this.logger.warn('setPermissions is deprecated. Data is managed in AuthService memory');
    }

    // ========================================
    // CLEANUP METHODS
    // ========================================

    /**
     * Clear all authentication-related data
     * Removes tokens and user data from all storage locations
     */
    clearAuth(): void {
        // Clear tokens via TokenStorageService
        this.tokenStorage.clearTokens();

        // Clear user data from sessionStorage
        sessionStorage.removeItem(this.USER_KEY);

        // Cleanup old localStorage data (migration)
        localStorage.removeItem('current_user');
        localStorage.removeItem('user_with_roles');
        localStorage.removeItem('user_permissions');
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        this.logger.debug('All auth data cleared from storage');
    }

    /**
     * Clear only user data (not tokens)
     */
    clearUserData(): void {
        sessionStorage.removeItem(this.USER_KEY);
        localStorage.removeItem('current_user');
        localStorage.removeItem('user_with_roles');
        localStorage.removeItem('user_permissions');

        this.logger.debug('User data cleared from storage');
    }
}
