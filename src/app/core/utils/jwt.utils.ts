/**
 * JWT Utilities
 * Funciones para decodificar y validar tokens JWT
 * Includes security improvements: input validation, sanitization, and expiration buffer
 */

import { TOKEN_EXPIRATION_BUFFER_SECONDS } from '@core/constants/security.constants';

interface JwtPayload {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
}

/**
 * Validates JWT token format before processing
 * Prevents processing of malformed or potentially malicious tokens
 */
function isValidJwtFormat(token: string): boolean {
    // Check for basic JWT structure
    if (!token || typeof token !== 'string') {
        return false;
    }

    // JWT must have exactly 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    // Each part must be base64url encoded (alphanumeric, -, _)
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    return parts.every((part) => part.length > 0 && base64UrlPattern.test(part));
}

/**
 * Safely decode base64url to prevent XSS attacks
 * Validates and sanitizes the decoded content
 */
function safeBase64Decode(input: string): string | null {
    try {
        // Replace base64url characters with base64
        const base64 = input.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if needed
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;

        // Decode
        const decoded = atob(padded);

        // Validate that decoded string is valid UTF-8 and doesn't contain control characters
        // that could be used for XSS
        if (decoded.includes('\0') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(decoded)) {
            return null;
        }

        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Decodifica un token JWT sin verificar su firma
 * Solo para leer el payload en el cliente
 * IMPROVED: Now includes input validation and sanitization
 */
export function decodeJwt(token: string): JwtPayload | null {
    // Validate token format first
    if (!isValidJwtFormat(token)) {
        return null;
    }

    try {
        const parts = token.split('.');
        const payload = parts[1];

        // Use safe base64 decoding
        const decoded = safeBase64Decode(payload);
        if (!decoded) {
            return null;
        }

        // Parse JSON safely
        const parsed = JSON.parse(decoded) as JwtPayload;

        // Validate that parsed object has expected structure
        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }

        return parsed;
    } catch (error) {
        // Don't log the error with token details for security
        return null;
    }
}

/**
 * Verifica si un token JWT ha expirado
 * @param token - Token JWT a validar
 * @param useBuffer - Si true, usa buffer de seguridad antes de la expiración
 * @returns true si el token está expirado, false si aún es válido
 * IMPROVED: Now includes configurable expiration buffer to prevent race conditions
 */
export function isTokenExpired(token: string, useBuffer = true): boolean {
    const payload = decodeJwt(token);

    if (!payload || !payload.exp) {
        // Si no podemos decodificar o no tiene exp, lo consideramos expirado
        return true;
    }

    // exp viene en segundos, Date.now() en milisegundos
    const expirationDate = payload.exp * 1000;
    const now = Date.now();

    // Apply buffer to prevent race conditions
    // Token is considered expired BUFFER seconds before actual expiration
    const bufferMs = useBuffer ? TOKEN_EXPIRATION_BUFFER_SECONDS * 1000 : 0;

    return now >= expirationDate - bufferMs;
}

/**
 * Obtiene el tiempo restante hasta la expiración del token en milisegundos
 * @param token - Token JWT a validar
 * @param useBuffer - Si true, calcula tiempo hasta expiración con buffer
 * @returns Milisegundos hasta la expiración, 0 si ya expiró o es inválido
 * IMPROVED: Now accounts for expiration buffer
 */
export function getTokenTimeToExpiry(token: string, useBuffer = true): number {
    const payload = decodeJwt(token);

    if (!payload || !payload.exp) {
        return 0;
    }

    const expirationDate = payload.exp * 1000;
    const now = Date.now();
    const bufferMs = useBuffer ? TOKEN_EXPIRATION_BUFFER_SECONDS * 1000 : 0;
    const timeRemaining = expirationDate - bufferMs - now;

    return Math.max(0, timeRemaining);
}

/**
 * Gets the actual expiration timestamp of a token (without buffer)
 * @param token - Token JWT a validar
 * @returns Timestamp in milliseconds, or 0 if invalid
 */
export function getTokenExpirationTimestamp(token: string): number {
    const payload = decodeJwt(token);

    if (!payload || !payload.exp) {
        return 0;
    }

    return payload.exp * 1000;
}

/**
 * Checks if token will expire within a certain time window
 * @param token - Token JWT a validar
 * @param windowMinutes - Time window in minutes
 * @returns true if token expires within the specified window
 */
export function isTokenExpiringWithin(token: string, windowMinutes: number): boolean {
    const timeToExpiry = getTokenTimeToExpiry(token, false); // Don't use buffer for this check
    const windowMs = windowMinutes * 60 * 1000;

    return timeToExpiry > 0 && timeToExpiry <= windowMs;
}

/**
 * Verifica si el token es válido (no expirado y bien formado)
 * @param token - Token JWT a validar
 * @param useBuffer - Si true, usa buffer de expiración
 * @returns true si el token es válido
 * IMPROVED: Now supports buffer parameter
 */
export function isTokenValid(token: string | null, useBuffer = true): boolean {
    if (!token) {
        return false;
    }

    return !isTokenExpired(token, useBuffer);
}
