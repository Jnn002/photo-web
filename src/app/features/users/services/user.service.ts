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
     * This fetches each user's roles for accurate filtering
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

            const response = await this.http
                .get<PaginatedResponseUserPublic>(this.apiUrl, { params })
                .toPromise();

            if (response) {
                // Load detailed info with roles for each user
                const usersWithRoles = await Promise.all(
                    response.items.map((user) => this.getUserWithRoles(user.id))
                );

                this._usersWithRoles.set(usersWithRoles.filter((u): u is UserWithRoles => u !== null));

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
