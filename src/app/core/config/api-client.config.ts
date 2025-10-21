/**
 * API Client Configuration Service
 *
 * Configures the generated API client to include authentication tokens
 * in all requests automatically.
 */

import { Injectable, inject } from '@angular/core';
import { client } from '@generated/client.gen';
import { StorageService } from '@core/services/storage';

@Injectable({
    providedIn: 'root',
})
export class ApiClientConfig {
    private readonly storage = inject(StorageService);
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        if (this.initialized) {
            return;
        }

        // Add request interceptor to include auth token
        client.interceptors.request.use((request, options) => {
            // Skip auth for login and refresh endpoints
            if (
                request.url.includes('/auth/login') ||
                request.url.includes('/auth/refresh') ||
                request.url.includes('/auth/register')
            ) {
                return request;
            }

            // Get token from storage
            const token = this.storage.getAccessToken();

            // Add Authorization header if token exists
            if (token) {
                // Clone the request with new headers
                const headers = new Headers(request.headers);
                headers.set('Authorization', `Bearer ${token}`);

                return new Request(request, { headers });
            }

            return request;
        });

        // Add response interceptor for error handling
        client.interceptors.response.use((response) => {
            // Handle 401 Unauthorized
            if (response.status === 401) {
                console.warn('Unauthorized request - Token may be invalid or expired');
            }

            return response;
        });

        this.initialized = true;
    }
}
