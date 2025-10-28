/**
 * User Service
 *
 * Manages user data with signals and integrates with the backend API.
 * Follows Angular 20+ best practices with signals-based state management.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type {
    UserPublic,
    UserWithRoles,
    UserListState,
    UserFilters,
    UserOption,
    PaginatedResponseUserPublic,
    PaginatedResponseUserWithRoles,
} from '../models/user.models';
import { userHasRole, filterUsersByRole, usersToOptions, ROLE_NAMES } from '../models/user.models';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly notificationService = inject(NotificationService);
    private readonly apiUrl = `${environment.apiUrl}/users`;

    // Private signals for internal state management
    private readonly _listState = signal<UserListState>({
        items: [],
        total: 0,
        loading: false,
        error: null,
        filters: {
            activeOnly: true,
            roleFilter: null,
            search: '',
        },
        pagination: {
            limit: 100,
            offset: 0,
        },
    });

    // Cached list of users with roles for role filtering
    private readonly _usersWithRoles = signal<UserWithRoles[]>([]);

    // Public readonly computed values for component consumption
    readonly items = computed(() => this._listState().items);
    readonly total = computed(() => this._listState().total);
    readonly loading = computed(() => this._listState().loading);
    readonly error = computed(() => this._listState().error);
    readonly filters = computed(() => this._listState().filters);
    readonly pagination = computed(() => this._listState().pagination);
    readonly hasMore = computed(() => {
        const state = this._listState();
        return state.pagination.offset + state.items.length < state.total;
    });

    // Computed signals for role-specific users
    readonly photographers = computed(() => {
        const users = this._usersWithRoles();
        return filterUsersByRole(users, ROLE_NAMES.PHOTOGRAPHER);
    });

    readonly editors = computed(() => {
        const users = this._usersWithRoles();
        return filterUsersByRole(users, ROLE_NAMES.EDITOR);
    });

    readonly coordinators = computed(() => {
        const users = this._usersWithRoles();
        return filterUsersByRole(users, ROLE_NAMES.COORDINATOR);
    });

    // Computed signals for dropdown options
    readonly photographerOptions = computed(() => usersToOptions(this.photographers()));
    readonly editorOptions = computed(() => usersToOptions(this.editors()));
    readonly coordinatorOptions = computed(() => usersToOptions(this.coordinators()));

    /**
     * Load users with current filters and pagination
     */
    async loadUsers(): Promise<void> {
        const currentState = this._listState();

        this._listState.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            let params = new HttpParams()
                .set('active_only', currentState.filters.activeOnly.toString())
                .set('limit', currentState.pagination.limit.toString())
                .set('offset', currentState.pagination.offset.toString());

            const response = await this.http
                .get<PaginatedResponseUserPublic>(this.apiUrl, { params })
                .toPromise();

            if (response) {
                this._listState.update((state) => ({
                    ...state,
                    items: response.items,
                    total: response.total,
                    loading: false,
                }));
            }
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al cargar usuarios');
            this._listState.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
        }
    }

    /**
     * Load users with roles for role-based filtering
     * Uses the optimized /with-roles endpoint to get all data in a single request
     */
    async loadUsersWithRoles(): Promise<void> {
        const currentState = this._listState();

        this._listState.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            let params = new HttpParams()
                .set('active_only', currentState.filters.activeOnly.toString())
                .set('limit', currentState.pagination.limit.toString())
                .set('offset', currentState.pagination.offset.toString());

            // Use the optimized /with-roles endpoint - single request gets all data including roles
            const response = await this.http
                .get<PaginatedResponseUserWithRoles>(`${this.apiUrl}/with-roles`, { params })
                .toPromise();

            if (response) {
                // Store users with roles for role-based filtering
                this._usersWithRoles.set(response.items);

                // Also update the main items list (cast to UserPublic for compatibility)
                this._listState.update((state) => ({
                    ...state,
                    items: response.items as unknown as UserPublic[],
                    total: response.total,
                    loading: false,
                }));
            }
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al cargar usuarios');
            this._listState.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
        }
    }

    /**
     * Get a single user with roles by ID
     */
    async getUserWithRoles(userId: number): Promise<UserWithRoles | null> {
        try {
            const response = await this.http
                .get<UserWithRoles>(`${this.apiUrl}/${userId}`)
                .toPromise();

            return response ?? null;
        } catch (error) {
            this.handleError(error, `Error al cargar usuario ${userId}`);
            return null;
        }
    }

    /**
     * Load photographers only (convenience method)
     */
    async loadPhotographers(): Promise<void> {
        await this.loadUsersWithRoles();
    }

    /**
     * Load editors only (convenience method)
     */
    async loadEditors(): Promise<void> {
        await this.loadUsersWithRoles();
    }

    /**
     * Update filters and reload users
     */
    updateFilters(filters: Partial<UserFilters>): void {
        this._listState.update((state) => ({
            ...state,
            filters: {
                ...state.filters,
                ...filters,
            },
            pagination: {
                ...state.pagination,
                offset: 0, // Reset to first page when filters change
            },
        }));
        this.loadUsers();
    }

    /**
     * Update pagination and reload users
     */
    updatePagination(limit: number, offset: number): void {
        this._listState.update((state) => ({
            ...state,
            pagination: { limit, offset },
        }));
        this.loadUsers();
    }

    /**
     * Reset filters to default values
     */
    resetFilters(): void {
        this._listState.update((state) => ({
            ...state,
            filters: {
                activeOnly: true,
                roleFilter: null,
                search: '',
            },
            pagination: {
                ...state.pagination,
                offset: 0,
            },
        }));
        this.loadUsers();
    }

    /**
     * Update user data (name, email, phone, etc.)
     */
    async updateUser(userId: number, data: Partial<UserPublic>): Promise<UserWithRoles | null> {
        try {
            const response = await this.http
                .patch<UserWithRoles>(`${this.apiUrl}/${userId}`, data)
                .toPromise();

            if (response) {
                this.notificationService.showSuccess('Usuario actualizado exitosamente');

                // Refresh the list if this user is in the current list
                await this.loadUsers();

                return response;
            }

            return null;
        } catch (error) {
            this.handleError(error, 'Error al actualizar usuario');
            return null;
        }
    }

    /**
     * Assign a role to a user
     */
    async assignRole(userId: number, roleId: number): Promise<boolean> {
        try {
            await this.http.post(`${this.apiUrl}/${userId}/roles/${roleId}`, {}).toPromise();

            this.notificationService.showSuccess('Rol asignado exitosamente');

            // Refresh the list to show updated roles
            await this.loadUsers();

            return true;
        } catch (error) {
            this.handleError(error, 'Error al asignar rol');
            return false;
        }
    }

    /**
     * Remove a role from a user
     */
    async removeRole(userId: number, roleId: number): Promise<boolean> {
        try {
            await this.http.delete(`${this.apiUrl}/${userId}/roles/${roleId}`).toPromise();

            this.notificationService.showSuccess('Rol removido exitosamente');

            // Refresh the list to show updated roles
            await this.loadUsers();

            return true;
        } catch (error) {
            this.handleError(error, 'Error al remover rol');
            return false;
        }
    }

    /**
     * Update user roles (assigns new roles and removes old ones)
     * This is a convenience method that compares current and new roles
     */
    async updateUserRoles(
        userId: number,
        currentRoleIds: number[],
        newRoleIds: number[]
    ): Promise<boolean> {
        try {
            // Find roles to add (in new but not in current)
            const rolesToAdd = newRoleIds.filter((id) => !currentRoleIds.includes(id));

            // Find roles to remove (in current but not in new)
            const rolesToRemove = currentRoleIds.filter((id) => !newRoleIds.includes(id));

            // Execute all role changes
            const addPromises = rolesToAdd.map((roleId) => this.assignRole(userId, roleId));
            const removePromises = rolesToRemove.map((roleId) => this.removeRole(userId, roleId));

            await Promise.all([...addPromises, ...removePromises]);

            return true;
        } catch (error) {
            this.handleError(error, 'Error al actualizar roles');
            return false;
        }
    }

    /**
     * Handle HTTP errors and show notifications
     */
    private handleError(error: unknown, defaultMessage: string): string {
        let errorMessage = defaultMessage;

        if (error instanceof HttpErrorResponse) {
            if (error.error?.detail) {
                errorMessage = error.error.detail;
            } else if (error.status === 404) {
                errorMessage = 'Usuario no encontrado';
            } else if (error.status === 403) {
                errorMessage = 'No tienes permisos para realizar esta acción';
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
