import { Injectable, signal } from '@angular/core';
import { STORAGE_KEYS } from '@core/constants/security.constants';
import { LoggingService } from './logging';

/**
 * Token storage strategy
 * - MEMORY: Store tokens only in memory (lost on page refresh) - Most secure
 * - SESSION: Store in sessionStorage (lost on tab close) - Balanced
 * - LOCAL: Store in localStorage (persists across sessions) - Least secure, backwards compatible
 */
export type TokenStorageStrategy = 'memory' | 'session' | 'local';

/**
 * Secure token storage service
 * Implements hybrid storage strategy for JWT tokens
 *
 * SECURITY IMPROVEMENTS:
 * - Access tokens stored in memory by default (XSS protection)
 * - Refresh tokens should use httpOnly cookies (backend responsibility)
 * - Fallback to sessionStorage for memory strategy on refresh
 * - No localStorage for tokens (XSS vulnerability)
 *
 * MIGRATION PLAN:
 * 1. Phase 1: Keep localStorage support for backwards compatibility
 * 2. Phase 2: Backend implements httpOnly cookies for refresh tokens
 * 3. Phase 3: Remove refresh token from frontend storage entirely
 * 4. Phase 4: Move access token to pure memory storage
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
    private readonly logger = new LoggingService();

    // Memory storage for access token (most secure)
    private readonly accessTokenSignal = signal<string | null>(null);

    // Current strategy (can be configured)
    private currentStrategy: TokenStorageStrategy = 'memory';

    constructor() {
        this.initializeFromStorage();
    }

    /**
     * Initialize tokens from storage on app load
     * Checks for existing tokens and loads them into memory
     */
    private initializeFromStorage(): void {
        // Check sessionStorage first (preferred)
        let token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        // Fallback to localStorage for backwards compatibility
        if (!token) {
            token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (token) {
                this.logger.warn('Found token in localStorage, migrating to sessionStorage');
                // Migrate to sessionStorage
                sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            }
        }

        if (token) {
            this.accessTokenSignal.set(token);
            this.logger.debug('Token loaded from storage');
        }
    }

    /**
     * Get the current access token
     * Always returns from memory signal
     */
    getAccessToken(): string | null {
        return this.accessTokenSignal();
    }

    /**
     * Set the access token
     * Stores in memory and persists based on strategy
     */
    setAccessToken(token: string): void {
        this.accessTokenSignal.set(token);

        // Persist based on strategy
        switch (this.currentStrategy) {
            case 'memory':
                // Also save to sessionStorage as fallback for page refresh
                sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
                // Remove from localStorage if present
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                break;

            case 'session':
                sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
                localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                break;

            case 'local':
                // Backwards compatibility only
                localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
                this.logger.warn('Using localStorage for tokens is deprecated and less secure');
                break;
        }

        this.logger.debug(`Token stored using ${this.currentStrategy} strategy`);
    }

    /**
     * Get refresh token
     * NOTE: In future, this will be handled by httpOnly cookies
     * For now, reading from localStorage for backwards compatibility
     */
    getRefreshToken(): string | null {
        // Check sessionStorage first
        let token = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        // Fallback to localStorage
        if (!token) {
            token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (token) {
                // Migrate to sessionStorage
                sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
                localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            }
        }

        return token;
    }

    /**
     * Set refresh token
     * NOTE: This is temporary. Backend should set httpOnly cookie instead
     */
    setRefreshToken(token: string): void {
        // Use sessionStorage for now
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        // Remove from localStorage
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        this.logger.debug('Refresh token stored (will migrate to httpOnly cookies)');
    }

    /**
     * Clear all tokens
     * Removes from all storage locations
     */
    clearTokens(): void {
        // Clear memory
        this.accessTokenSignal.set(null);

        // Clear sessionStorage
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        // Clear localStorage (cleanup for migration)
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        this.logger.debug('All tokens cleared');
    }

    /**
     * Change storage strategy
     * Useful for testing or configuration
     */
    setStorageStrategy(strategy: TokenStorageStrategy): void {
        const oldStrategy = this.currentStrategy;
        this.currentStrategy = strategy;

        // If we have a token, re-persist with new strategy
        const currentToken = this.accessTokenSignal();
        if (currentToken) {
            this.setAccessToken(currentToken);
        }

        this.logger.info(`Storage strategy changed from ${oldStrategy} to ${strategy}`);
    }

    /**
     * Get current storage strategy
     */
    getStorageStrategy(): TokenStorageStrategy {
        return this.currentStrategy;
    }

    /**
     * Check if tokens exist
     */
    hasTokens(): boolean {
        return this.accessTokenSignal() !== null && this.getRefreshToken() !== null;
    }

    /**
     * Check if only access token exists
     */
    hasAccessToken(): boolean {
        return this.accessTokenSignal() !== null;
    }
}
