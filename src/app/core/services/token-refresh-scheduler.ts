import { Injectable, inject, signal } from '@angular/core';
import { TOKEN_AUTO_REFRESH_MINUTES } from '@core/constants/security.constants';
import { getTokenTimeToExpiry, isTokenExpiringWithin } from '@core/utils/jwt.utils';
import { LoggingService } from './logging';
import { Observable, Subject } from 'rxjs';

/**
 * Token Refresh Scheduler Service
 *
 * Proactively refreshes tokens before they expire to improve UX
 * Prevents 401 errors and provides seamless authentication experience
 *
 * FEATURES:
 * - Schedules automatic token refresh before expiration
 * - Configurable refresh window (default: 10 minutes before expiry)
 * - Emits event when refresh is needed
 * - Handles cleanup on logout
 * - Prevents multiple concurrent refresh schedules
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshSchedulerService {
    private readonly logger = inject(LoggingService);

    // Observable that emits when token should be refreshed
    private readonly refreshNeeded$ = new Subject<void>();

    // Current timeout ID
    private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Signal to track if refresh is scheduled
    private readonly isScheduled = signal<boolean>(false);

    // Signal for next refresh time
    private readonly nextRefreshTime = signal<number | null>(null);

    /**
     * Observable that emits when token refresh is needed
     * Subscribe to this in AuthService or TokenRefreshService
     */
    get onRefreshNeeded(): Observable<void> {
        return this.refreshNeeded$.asObservable();
    }

    /**
     * Check if a refresh is currently scheduled
     */
    isRefreshScheduled(): boolean {
        return this.isScheduled();
    }

    /**
     * Get the timestamp when next refresh will occur
     */
    getNextRefreshTime(): number | null {
        return this.nextRefreshTime();
    }

    /**
     * Schedule automatic token refresh
     * Calculates when token will expire and schedules refresh before expiration
     *
     * @param accessToken - Current access token
     * @param refreshMinutesBefore - Minutes before expiration to trigger refresh (default from constants)
     */
    scheduleTokenRefresh(accessToken: string, refreshMinutesBefore: number = TOKEN_AUTO_REFRESH_MINUTES): void {
        // Cancel any existing scheduled refresh
        this.cancelScheduledRefresh();

        // Check if token is already close to expiration
        if (isTokenExpiringWithin(accessToken, refreshMinutesBefore)) {
            this.logger.debug('Token is already within refresh window, triggering immediate refresh');
            this.refreshNeeded$.next();
            return;
        }

        // Calculate time until we should refresh
        const timeToExpiry = getTokenTimeToExpiry(accessToken, false); // Don't use buffer for scheduling
        const refreshWindow = refreshMinutesBefore * 60 * 1000; // Convert to milliseconds
        const timeUntilRefresh = timeToExpiry - refreshWindow;

        if (timeUntilRefresh <= 0) {
            // Token expires too soon, refresh now
            this.logger.debug('Token expires soon, triggering immediate refresh');
            this.refreshNeeded$.next();
            return;
        }

        // Schedule the refresh
        const refreshAt = Date.now() + timeUntilRefresh;
        this.nextRefreshTime.set(refreshAt);

        this.refreshTimeoutId = setTimeout(() => {
            this.logger.info('Scheduled token refresh triggered');
            this.refreshNeeded$.next();
            this.isScheduled.set(false);
            this.nextRefreshTime.set(null);
        }, timeUntilRefresh);

        this.isScheduled.set(true);

        const refreshDate = new Date(refreshAt).toLocaleTimeString();
        this.logger.debug(`Token refresh scheduled for ${refreshDate} (in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes)`);
    }

    /**
     * Cancel any scheduled token refresh
     * Call this on logout or when manually refreshing
     */
    cancelScheduledRefresh(): void {
        if (this.refreshTimeoutId !== null) {
            clearTimeout(this.refreshTimeoutId);
            this.refreshTimeoutId = null;
            this.isScheduled.set(false);
            this.nextRefreshTime.set(null);
            this.logger.debug('Scheduled token refresh cancelled');
        }
    }

    /**
     * Reschedule with a new token
     * Convenience method that cancels and schedules in one call
     */
    reschedule(accessToken: string): void {
        this.cancelScheduledRefresh();
        this.scheduleTokenRefresh(accessToken);
    }

    /**
     * Clean up resources
     * Call this on service destroy or logout
     */
    cleanup(): void {
        this.cancelScheduledRefresh();
        this.logger.debug('TokenRefreshScheduler cleaned up');
    }
}
