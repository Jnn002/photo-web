/**
 * Centralized security configuration constants
 * Single source of truth for security-related settings
 */

/**
 * Public endpoints that don't require authentication
 * Used by interceptors to skip token attachment and refresh logic
 *
 * IMPORTANT: Keep this list minimal and well-documented
 * Only add endpoints that are truly public
 */
export const PUBLIC_ENDPOINTS = [
    '/auth/login', // User login
    '/auth/refresh', // Token refresh (uses refresh token, not access token)
    '/auth/register', // User registration with invitation
    '/invitations/validate', // Invitation token validation
] as const;

/**
 * Token expiration buffer in seconds
 * Tokens are considered expired this many seconds before actual expiration
 * Prevents race conditions and improves UX
 */
export const TOKEN_EXPIRATION_BUFFER_SECONDS = 60; // 1 minute

/**
 * How many minutes before actual token expiration to show warning to user
 */
export const SESSION_WARNING_MINUTES = 5;

/**
 * How many minutes before actual token expiration to trigger auto-refresh
 */
export const TOKEN_AUTO_REFRESH_MINUTES = 10;

/**
 * Maximum number of token refresh retry attempts
 */
export const MAX_TOKEN_REFRESH_ATTEMPTS = 3;

/**
 * HTTP request timeout in milliseconds
 */
export const HTTP_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Storage keys for localStorage/sessionStorage
 */
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token', // Will be removed in favor of httpOnly cookies
    USER_WITH_ROLES: 'user_with_roles',
    PERMISSIONS: 'user_permissions',
    ROLES: 'user_roles',
    THEME: 'app_theme',
    LANGUAGE: 'app_language',
} as const;

/**
 * Password validation requirements
 */
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 10,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Rate limiting configuration for client-side throttling
 */
export const RATE_LIMITS = {
    LOGIN_ATTEMPTS_MAX: 5,
    LOGIN_ATTEMPTS_WINDOW_MS: 300000, // 5 minutes
    PASSWORD_RESET_MAX: 3,
    PASSWORD_RESET_WINDOW_MS: 3600000, // 1 hour
} as const;

/**
 * Security event types for audit logging
 */
export const SECURITY_EVENTS = {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
    TOKEN_REFRESH_SUCCESS: 'token_refresh_success',
    TOKEN_REFRESH_FAILED: 'token_refresh_failed',
    TOKEN_EXPIRED: 'token_expired',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    PERMISSION_DENIED: 'permission_denied',
    SESSION_TIMEOUT_WARNING: 'session_timeout_warning',
    SESSION_EXTENDED: 'session_extended',
} as const;

/**
 * Helper function to check if an endpoint is public
 */
export function isPublicEndpoint(url: string): boolean {
    return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

/**
 * Helper function to check if a storage key contains sensitive data
 */
export function isSensitiveStorageKey(key: string): boolean {
    const sensitiveKeys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_WITH_ROLES,
        STORAGE_KEYS.PERMISSIONS,
    ];
    return sensitiveKeys.includes(key as (typeof sensitiveKeys)[number]);
}
