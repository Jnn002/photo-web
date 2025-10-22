import {
    ApplicationConfig,
    provideZonelessChangeDetection,
    APP_INITIALIZER,
    inject
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { tokenRefreshInterceptor } from './core/interceptors/token-refresh.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth';

/**
 * Factory function para inicializar AuthService antes del bootstrap
 * Garantiza que el estado de autenticación esté disponible antes del routing
 */
function initializeAuth(): () => void {
    const authService = inject(AuthService);
    // El constructor de AuthService ya ejecuta initializeAuth() síncronamente
    // Solo necesitamos forzar la creación del servicio
    return () => {
        // No-op: la inicialización ya ocurrió en el constructor
    };
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([
                authInterceptor,
                tokenRefreshInterceptor,
                errorInterceptor
            ])
        ),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura,
                options: {
                    prefix: 'p',
                    darkModeSelector: 'class',
                    cssLayer: false
                }
            }
        }),
        MessageService,
        // Inicializar AuthService antes del bootstrap de la app
        {
            provide: APP_INITIALIZER,
            useFactory: initializeAuth,
            multi: true
        }
    ],
};
