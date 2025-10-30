import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';

/**
 * Logging levels in order of severity
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

/**
 * Environment-aware logging service
 * Automatically disables debug/info logs in production
 * Sanitizes sensitive information from logs
 */
@Injectable({ providedIn: 'root' })
export class LoggingService {
    private readonly currentLogLevel: LogLevel;

    constructor() {
        // In production, only show errors
        // In development, show everything
        this.currentLogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;
    }

    /**
     * Debug level logging - only shown in development
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(`[DEBUG] ${message}`, ...this.sanitize(args));
        }
    }

    /**
     * Info level logging - only shown in development
     */
    info(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(`[INFO] ${message}`, ...this.sanitize(args));
        }
    }

    /**
     * Warning level logging - shown in development
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[WARN] ${message}`, ...this.sanitize(args));
        }
    }

    /**
     * Error level logging - always shown
     * Use for critical errors that need attention
     */
    error(message: string, error?: unknown, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            if (error instanceof Error) {
                console.error(`[ERROR] ${message}`, error.message, error.stack, ...this.sanitize(args));
            } else {
                console.error(`[ERROR] ${message}`, error, ...this.sanitize(args));
            }
        }
    }

    /**
     * Security-specific logging for audit trail
     * Always logged regardless of level
     */
    security(event: string, details?: Record<string, unknown>): void {
        const sanitizedDetails = this.sanitizeObject(details ?? {});
        console.warn(`[SECURITY] ${event}`, sanitizedDetails);

        // In production, this could be sent to a logging service
        // this.sendToLoggingService(event, sanitizedDetails);
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLogLevel;
    }

    /**
     * Sanitize arguments to prevent logging sensitive data
     */
    private sanitize(args: unknown[]): unknown[] {
        return args.map((arg) => {
            if (typeof arg === 'string') {
                return this.sanitizeString(arg);
            }
            if (arg && typeof arg === 'object') {
                return this.sanitizeObject(arg);
            }
            return arg;
        });
    }

    /**
     * Remove sensitive patterns from strings
     */
    private sanitizeString(str: string): string {
        // Remove potential JWT tokens
        str = str.replace(/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g, '[TOKEN_REDACTED]');

        // Remove Bearer tokens
        str = str.replace(/Bearer\s+[A-Za-z0-9-_.+/=]+/gi, 'Bearer [TOKEN_REDACTED]');

        // Remove password fields
        str = str.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"');

        // Remove email patterns if in sensitive contexts
        // str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

        return str;
    }

    /**
     * Sanitize objects by removing sensitive keys
     */
    private sanitizeObject(obj: unknown): unknown {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item));
        }

        const sanitized: Record<string, unknown> = {};
        const sensitiveKeys = ['password', 'token', 'refresh_token', 'access_token', 'authorization', 'secret'];

        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (value && typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}
