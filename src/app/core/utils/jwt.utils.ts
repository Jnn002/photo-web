/**
 * JWT Utilities
 * Funciones para decodificar y validar tokens JWT
 */

interface JwtPayload {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
}

/**
 * Decodifica un token JWT sin verificar su firma
 * Solo para leer el payload en el cliente
 */
export function decodeJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = parts[1];
        const decoded = atob(payload);
        return JSON.parse(decoded) as JwtPayload;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

/**
 * Verifica si un token JWT ha expirado
 * @param token - Token JWT a validar
 * @returns true si el token está expirado, false si aún es válido
 */
export function isTokenExpired(token: string): boolean {
    const payload = decodeJwt(token);

    if (!payload || !payload.exp) {
        // Si no podemos decodificar o no tiene exp, lo consideramos expirado
        return true;
    }

    // exp viene en segundos, Date.now() en milisegundos
    const expirationDate = payload.exp * 1000;
    const now = Date.now();

    return now >= expirationDate;
}

/**
 * Obtiene el tiempo restante hasta la expiración del token en milisegundos
 * @param token - Token JWT a validar
 * @returns Milisegundos hasta la expiración, 0 si ya expiró o es inválido
 */
export function getTokenTimeToExpiry(token: string): number {
    const payload = decodeJwt(token);

    if (!payload || !payload.exp) {
        return 0;
    }

    const expirationDate = payload.exp * 1000;
    const now = Date.now();
    const timeRemaining = expirationDate - now;

    return Math.max(0, timeRemaining);
}

/**
 * Verifica si el token es válido (no expirado y bien formado)
 * @param token - Token JWT a validar
 * @returns true si el token es válido
 */
export function isTokenValid(token: string | null): boolean {
    if (!token) {
        return false;
    }

    return !isTokenExpired(token);
}
