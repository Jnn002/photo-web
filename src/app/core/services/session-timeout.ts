import { Injectable, inject, signal } from '@angular/core';
import { SESSION_WARNING_MINUTES, SECURITY_EVENTS } from '@core/constants/security.constants';
import { getTokenExpirationTimestamp, getTokenTimeToExpiry } from '@core/utils/jwt.utils';
import { LoggingService } from './logging';
import { NotificationService } from './notification';
import { Observable, Subject } from 'rxjs';

/**
 * Session timeout warning states
 */
export interface SessionTimeoutWarning {
    minutesRemaining: number;
    expiresAt: Date;
    canExtend: boolean;
}

/**
 * Session Timeout Service
 *
 * Manages session expiration warnings and user notifications
 * Improves UX by warning users before their session expires
 *
 * FEATURES:
 * - Warns user N minutes before session expiration
 * - Provides "Extend Session" option
 * - Auto-logout when session expires
 * - Activity tracking (optional)
 * - Toast notifications for warnings
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
    private readonly logger = inject(LoggingService);
    private readonly notification = inject(NotificationService);

    // Observables for session events
    private readonly sessionExpiring$ = new Subject<SessionTimeoutWarning>();
    private readonly sessionExpired$ = new Subject<void>();
    private readonly sessionExtended$ = new Subject<void>();

    // Timeout IDs
    private warningTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private expirationTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Signals for state
    private readonly warningActive = signal<boolean>(false);
    private readonly currentWarning = signal<SessionTimeoutWarning | null>(null);

    // Activity tracking
    private lastActivityTime = Date.now();
    private activityCheckIntervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Observable that emits when session is about to expire
     */
    get onSessionExpiring(): Observable<SessionTimeoutWarning> {
        return this.sessionExpiring$.asObservable();
    }

    /**
     * Observable that emits when session has expired
     */
    get onSessionExpired(): Observable<void> {
        return this.sessionExpired$.asObservable();
    }

    /**
     * Observable that emits when user extends session
     */
    get onSessionExtended(): Observable<void> {
        return this.sessionExtended$.asObservable();
    }

    /**
     * Check if warning is currently active
     */
    isWarningActive(): boolean {
        return this.warningActive();
    }

    /**
     * Get current warning details
     */
    getCurrentWarning(): SessionTimeoutWarning | null {
        return this.currentWarning();
    }

    /**
     * Start monitoring session timeout
     * Call this after successful login with the access token
     *
     * @param accessToken - Current access token
     * @param warningMinutes - Minutes before expiration to show warning
     */
    startMonitoring(accessToken: string, warningMinutes: number = SESSION_WARNING_MINUTES): void {
        // Clear any existing timers
        this.stopMonitoring();

        const timeToExpiry = getTokenTimeToExpiry(accessToken, false);
        const expirationTimestamp = getTokenExpirationTimestamp(accessToken);

        if (timeToExpiry <= 0 || expirationTimestamp === 0) {
            this.logger.warn('Cannot monitor invalid or expired token');
            return;
        }

        const warningWindow = warningMinutes * 60 * 1000; // Convert to milliseconds
        const timeUntilWarning = timeToExpiry - warningWindow;

        // Schedule warning
        if (timeUntilWarning > 0) {
            this.warningTimeoutId = setTimeout(() => {
                this.showExpirationWarning(expirationTimestamp, warningMinutes);
            }, timeUntilWarning);

            const warningDate = new Date(Date.now() + timeUntilWarning).toLocaleTimeString();
            this.logger.debug(`Session timeout warning scheduled for ${warningDate}`);
        } else {
            // Token expires soon, show warning immediately
            this.showExpirationWarning(expirationTimestamp, warningMinutes);
        }

        // Schedule auto-logout when token actually expires
        this.expirationTimeoutId = setTimeout(() => {
            this.handleSessionExpiration();
        }, timeToExpiry);

        const expiryDate = new Date(expirationTimestamp).toLocaleTimeString();
        this.logger.debug(`Session expiration scheduled for ${expiryDate}`);
    }

    /**
     * Stop monitoring session timeout
     * Call this on logout or when refreshing token
     */
    stopMonitoring(): void {
        if (this.warningTimeoutId !== null) {
            clearTimeout(this.warningTimeoutId);
            this.warningTimeoutId = null;
        }

        if (this.expirationTimeoutId !== null) {
            clearTimeout(this.expirationTimeoutId);
            this.expirationTimeoutId = null;
        }

        this.dismissWarning();
        this.logger.debug('Session timeout monitoring stopped');
    }

    /**
     * Show expiration warning to user
     */
    private showExpirationWarning(expiresAt: number, minutesRemaining: number): void {
        const warning: SessionTimeoutWarning = {
            minutesRemaining,
            expiresAt: new Date(expiresAt),
            canExtend: true,
        };

        this.warningActive.set(true);
        this.currentWarning.set(warning);
        this.sessionExpiring$.next(warning);

        // Show toast notification
        this.notification.showWarning(
            `Tu sesión expirará en ${minutesRemaining} minutos. ¿Deseas mantener tu sesión activa?`,
            'Sesión por expirar'
        );

        // Log security event
        this.logger.security(SECURITY_EVENTS.SESSION_TIMEOUT_WARNING, {
            minutesRemaining,
            expiresAt: warning.expiresAt.toISOString(),
        });
    }

    /**
     * Handle session expiration
     */
    private handleSessionExpiration(): void {
        this.warningActive.set(false);
        this.currentWarning.set(null);
        this.sessionExpired$.next();

        this.notification.showError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'Sesión expirada');

        this.logger.security(SECURITY_EVENTS.TOKEN_EXPIRED, {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Dismiss current warning
     */
    dismissWarning(): void {
        this.warningActive.set(false);
        this.currentWarning.set(null);
    }

    /**
     * User chose to extend session
     * This should trigger a token refresh in AuthService
     */
    extendSession(): void {
        this.dismissWarning();
        this.sessionExtended$.next();

        this.logger.security(SECURITY_EVENTS.SESSION_EXTENDED, {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Reschedule with new token after refresh
     */
    reschedule(accessToken: string): void {
        this.stopMonitoring();
        this.startMonitoring(accessToken);
    }

    /**
     * Start tracking user activity
     * Can be used to auto-extend sessions on activity
     */
    startActivityTracking(): void {
        this.lastActivityTime = Date.now();

        // Listen to user events
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((event) => {
            document.addEventListener(event, this.updateActivity.bind(this), { passive: true });
        });

        // Check activity every minute
        this.activityCheckIntervalId = setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivityTime;
            const minutesSinceActivity = Math.floor(timeSinceActivity / 60000);

            if (minutesSinceActivity > 30) {
                this.logger.debug(`No activity for ${minutesSinceActivity} minutes`);
            }
        }, 60000);

        this.logger.debug('Activity tracking started');
    }

    /**
     * Stop tracking user activity
     */
    stopActivityTracking(): void {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((event) => {
            document.removeEventListener(event, this.updateActivity.bind(this));
        });

        if (this.activityCheckIntervalId !== null) {
            clearInterval(this.activityCheckIntervalId);
            this.activityCheckIntervalId = null;
        }

        this.logger.debug('Activity tracking stopped');
    }

    /**
     * Update last activity time
     */
    private updateActivity(): void {
        this.lastActivityTime = Date.now();
    }

    /**
     * Get time since last activity in minutes
     */
    getTimeSinceLastActivity(): number {
        const timeSinceActivity = Date.now() - this.lastActivityTime;
        return Math.floor(timeSinceActivity / 60000);
    }

    /**
     * Clean up all resources
     */
    cleanup(): void {
        this.stopMonitoring();
        this.stopActivityTracking();
        this.logger.debug('SessionTimeoutService cleaned up');
    }
}
