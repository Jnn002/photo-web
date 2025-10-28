/**
 * Cache Service
 *
 * Generic caching service with TTL support, pattern-based invalidation,
 * and memory management. Follows Angular 20+ best practices with signals.
 */

import { Injectable, signal, computed } from '@angular/core';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
    key: string;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
    ttl?: number; // Time to live in milliseconds (default: 5 minutes)
    persistent?: boolean; // Use localStorage (default: false)
}

/**
 * Cache statistics
 */
export interface CacheStats {
    hits: number;
    misses: number;
    entries: number;
    hitRate: number;
}

@Injectable({
    providedIn: 'root',
})
export class CacheService {
    // In-memory cache storage
    private readonly cache = new Map<string, CacheEntry<unknown>>();

    // Cache statistics
    private readonly _stats = signal<CacheStats>({
        hits: 0,
        misses: 0,
        entries: 0,
        hitRate: 0,
    });

    // Public readonly stats
    readonly stats = this._stats.asReadonly();

    // Default TTL: 5 minutes
    private readonly DEFAULT_TTL = 5 * 60 * 1000;

    // Maximum cache entries (LRU eviction)
    private readonly MAX_ENTRIES = 100;

    /**
     * Get data from cache
     * Returns null if not found or expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;

        if (!entry) {
            this.recordMiss();
            return null;
        }

        // Check if expired
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.recordMiss();
            this.updateEntryCount();
            return null;
        }

        this.recordHit();
        return entry.data;
    }

    /**
     * Set data in cache with optional TTL
     */
    set<T>(key: string, data: T, options?: CacheOptions): void {
        const ttl = options?.ttl ?? this.DEFAULT_TTL;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            key,
        };

        // Evict oldest entry if at capacity
        if (this.cache.size >= this.MAX_ENTRIES && !this.cache.has(key)) {
            this.evictOldest();
        }

        this.cache.set(key, entry);

        // Optionally persist to localStorage
        if (options?.persistent) {
            this.persistToStorage(key, entry);
        }

        this.updateEntryCount();
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.updateEntryCount();
            return false;
        }

        return true;
    }

    /**
     * Invalidate (delete) specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
        this.removeFromStorage(key);
        this.updateEntryCount();
    }

    /**
     * Invalidate all cache entries matching a pattern
     * Supports wildcards: 'clients:*', 'sessions:list:*'
     */
    invalidatePattern(pattern: string): void {
        const regex = this.patternToRegex(pattern);
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach((key) => {
            this.cache.delete(key);
            this.removeFromStorage(key);
        });

        this.updateEntryCount();
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.clearStorage();
        this.updateEntryCount();
    }

    /**
     * Clear all entries for a specific user (on logout)
     */
    clearUserCache(userId: number): void {
        this.invalidatePattern(`user:${userId}:*`);
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return this._stats();
    }

    /**
     * Get all cache keys (for debugging)
     */
    getKeys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache size
     */
    getSize(): number {
        return this.cache.size;
    }

    /**
     * Cleanup expired entries (can be called periodically)
     */
    cleanup(): void {
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach((key) => {
            this.cache.delete(key);
            this.removeFromStorage(key);
        });

        this.updateEntryCount();
    }

    /**
     * Check if cache entry is expired
     */
    private isExpired(entry: CacheEntry<unknown>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Convert wildcard pattern to regex
     */
    private patternToRegex(pattern: string): RegExp {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escaped.replace(/\\\*/g, '.*');
        return new RegExp(`^${regexPattern}$`);
    }

    /**
     * Evict oldest cache entry (LRU)
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.removeFromStorage(oldestKey);
        }
    }

    /**
     * Record cache hit
     */
    private recordHit(): void {
        this._stats.update((stats) => {
            const hits = stats.hits + 1;
            const total = hits + stats.misses;
            return {
                ...stats,
                hits,
                hitRate: total > 0 ? (hits / total) * 100 : 0,
            };
        });
    }

    /**
     * Record cache miss
     */
    private recordMiss(): void {
        this._stats.update((stats) => {
            const misses = stats.misses + 1;
            const total = stats.hits + misses;
            return {
                ...stats,
                misses,
                hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
            };
        });
    }

    /**
     * Update entry count in stats
     */
    private updateEntryCount(): void {
        this._stats.update((stats) => ({
            ...stats,
            entries: this.cache.size,
        }));
    }

    /**
     * Persist entry to localStorage
     */
    private persistToStorage(key: string, entry: CacheEntry<unknown>): void {
        try {
            const storageKey = `cache:${key}`;
            localStorage.setItem(storageKey, JSON.stringify(entry));
        } catch (error) {
            console.warn('[CacheService] Failed to persist to localStorage:', error);
        }
    }

    /**
     * Remove entry from localStorage
     */
    private removeFromStorage(key: string): void {
        try {
            const storageKey = `cache:${key}`;
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('[CacheService] Failed to remove from localStorage:', error);
        }
    }

    /**
     * Clear all cache entries from localStorage
     */
    private clearStorage(): void {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('cache:')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            console.warn('[CacheService] Failed to clear localStorage:', error);
        }
    }

    /**
     * Load cache from localStorage on init (for persistent entries)
     */
    loadFromStorage(): void {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (!storageKey?.startsWith('cache:')) continue;

                const data = localStorage.getItem(storageKey);
                if (!data) continue;

                const entry = JSON.parse(data) as CacheEntry<unknown>;
                const key = storageKey.replace('cache:', '');

                // Only load if not expired
                if (!this.isExpired(entry)) {
                    this.cache.set(key, entry);
                } else {
                    localStorage.removeItem(storageKey);
                }
            }

            this.updateEntryCount();
        } catch (error) {
            console.warn('[CacheService] Failed to load from localStorage:', error);
        }
    }
}
