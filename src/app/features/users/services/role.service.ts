/**
 * Role Service
 *
 * Manages system roles with signals and integrates with the backend API.
 * Provides cached role data for dropdowns and role management.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type { RolePublic } from '../models/user.models';
import type { PaginatedResponseRolePublic } from '@generated/types.gen';

interface RoleState {
    roles: RolePublic[];
    loading: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root',
})
export class RoleService {
    private readonly http = inject(HttpClient);
    private readonly notificationService = inject(NotificationService);
    private readonly apiUrl = `${environment.apiUrl}/roles`;

    // Private signal for internal state management
    private readonly _state = signal<RoleState>({
        roles: [],
        loading: false,
        error: null,
    });

    // Public readonly computed values for component consumption
    readonly roles = computed(() => this._state().roles);
    readonly loading = computed(() => this._state().loading);
    readonly error = computed(() => this._state().error);

    // Computed signal for role options (for dropdowns/multiselect)
    readonly roleOptions = computed(() => {
        const roles = this._state().roles;
        if (!Array.isArray(roles)) {
            return [];
        }
        return roles.map((role) => ({
            label: this.getRoleDisplayName(role.name),
            value: role.id,
        }));
    });

    /**
     * Load all available roles from backend
     */
    async loadRoles(): Promise<void> {
        // Don't reload if already loaded
        if (this._state().roles.length > 0) {
            return;
        }

        this._state.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await this.http
                .get<PaginatedResponseRolePublic>(this.apiUrl, {
                    params: {
                        active_only: 'true',
                        limit: '100',
                        offset: '0',
                    },
                })
                .toPromise();

            this._state.update((state) => ({
                ...state,
                roles: response?.items ?? [],
                loading: false,
            }));
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al cargar roles');
            this._state.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
        }
    }

    /**
     * Force reload roles from backend
     */
    async reloadRoles(): Promise<void> {
        this._state.update((state) => ({
            ...state,
            roles: [], // Clear cache
        }));
        await this.loadRoles();
    }

    /**
     * Get role by ID
     */
    getRoleById(roleId: number): RolePublic | undefined {
        return this._state().roles.find((role) => role.id === roleId);
    }

    /**
     * Get role by name
     */
    getRoleByName(roleName: string): RolePublic | undefined {
        return this._state()
            .roles.find((role) => role.name.toLowerCase() === roleName.toLowerCase());
    }

    /**
     * Get display name for role (capitalize first letter)
     */
    private getRoleDisplayName(roleName: string): string {
        const displayNames: Record<string, string> = {
            admin: 'Administrador',
            coordinator: 'Coordinador',
            photographer: 'Fotógrafo',
            editor: 'Editor',
            user: 'Usuario',
        };

        return displayNames[roleName.toLowerCase()] || roleName;
    }

    /**
     * Handle HTTP errors and show notifications
     */
    private handleError(error: unknown, defaultMessage: string): string {
        let errorMessage = defaultMessage;

        if (error instanceof HttpErrorResponse) {
            if (error.error?.detail) {
                errorMessage = error.error.detail;
            } else if (error.status === 403) {
                errorMessage = 'No tienes permisos para ver roles';
            } else if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status >= 500) {
                errorMessage = 'Error del servidor. Por favor, intenta más tarde';
            }
        }

        this.notificationService.showError(errorMessage);
        return errorMessage;
    }
}
