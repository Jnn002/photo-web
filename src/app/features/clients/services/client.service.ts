/**
 * Client Service
 *
 * Manages client data with signals and integrates with the backend API.
 * Follows Angular 20+ best practices with signals-based state management.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
    listClientsApiV1ClientsGet,
    createClientApiV1ClientsPost,
    getClientApiV1ClientsClientIdGet,
    updateClientApiV1ClientsClientIdPatch,
    deactivateClientApiV1ClientsClientIdDelete,
    reactivateClientApiV1ClientsClientIdReactivatePut,
    listSessionsApiV1SessionsGet,
} from '@generated/sdk.gen';
import type { SessionPublic } from '@generated/types.gen';
import { NotificationService } from '@core/services/notification';
import type { ClientPublic, ClientCreate, ClientUpdate, ClientType } from '../models/client.models';
import type { ClientListState, ClientDetailsState, ClientFilters } from '../models/client.models';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    private readonly notificationService = inject(NotificationService);

    // Private signals for internal state management
    private readonly _listState = signal<ClientListState>({
        items: [],
        total: 0,
        loading: false,
        error: null,
        filters: {
            activeOnly: false,
            clientType: null,
            search: '',
        },
        pagination: {
            limit: 50,
            offset: 0,
        },
    });

    private readonly _detailsState = signal<ClientDetailsState>({
        client: null,
        loading: false,
        error: null,
    });

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

    readonly currentClient = computed(() => this._detailsState().client);
    readonly detailsLoading = computed(() => this._detailsState().loading);
    readonly detailsError = computed(() => this._detailsState().error);

    /**
     * Load clients with current filters and pagination
     */
    async loadClients(): Promise<void> {
        const currentState = this._listState();

        this._listState.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await listClientsApiV1ClientsGet({
                query: {
                    active_only: currentState.filters.activeOnly,
                    client_type: currentState.filters.clientType ?? undefined,
                    search: currentState.filters.search || undefined,
                    limit: currentState.pagination.limit,
                    offset: currentState.pagination.offset,
                },
            });

            if (response.data) {
                this._listState.update((state) => ({
                    ...state,
                    items: response.data.items,
                    total: response.data.total,
                    loading: false,
                }));
            }
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al cargar clientes');
            this._listState.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
        }
    }

    /**
     * Load a single client by ID
     */
    async loadClient(clientId: number): Promise<void> {
        this._detailsState.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await getClientApiV1ClientsClientIdGet({
                path: { client_id: clientId },
            });

            if (response.data) {
                this._detailsState.update((state) => ({
                    ...state,
                    client: response.data,
                    loading: false,
                }));
            }
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al cargar cliente');
            this._detailsState.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
        }
    }

    /**
     * Create a new client
     */
    async createClient(data: ClientCreate): Promise<ClientPublic | null> {
        try {
            const response = await createClientApiV1ClientsPost({
                body: data,
            });

            if (response.data) {
                this.notificationService.showSuccess('Cliente creado exitosamente');
                await this.loadClients(); // Refresh the list
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError(error, 'Error al crear cliente');
            return null;
        }
    }

    /**
     * Update an existing client
     */
    async updateClient(clientId: number, data: ClientUpdate): Promise<ClientPublic | null> {
        try {
            const response = await updateClientApiV1ClientsClientIdPatch({
                path: { client_id: clientId },
                body: data,
            });

            if (response.data) {
                this.notificationService.showSuccess('Cliente actualizado exitosamente');
                await this.loadClients(); // Refresh the list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId); // Refresh details if viewing this client
                }
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError(error, 'Error al actualizar cliente');
            return null;
        }
    }

    /**
     * Deactivate a client (soft delete)
     */
    async deactivateClient(clientId: number): Promise<boolean> {
        try {
            const response = await deactivateClientApiV1ClientsClientIdDelete({
                path: { client_id: clientId },
            });

            if (response.data) {
                this.notificationService.showSuccess('Cliente desactivado exitosamente');
                await this.loadClients(); // Refresh the list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId); // Refresh details if viewing this client
                }
                return true;
            }
            return false;
        } catch (error) {
            this.handleError(error, 'Error al desactivar cliente');
            return false;
        }
    }

    /**
     * Reactivate a deactivated client
     */
    async reactivateClient(clientId: number): Promise<boolean> {
        try {
            const response = await reactivateClientApiV1ClientsClientIdReactivatePut({
                path: { client_id: clientId },
            });

            if (response.data) {
                this.notificationService.showSuccess('Cliente reactivado exitosamente');
                await this.loadClients(); // Refresh the list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId); // Refresh details if viewing this client
                }
                return true;
            }
            return false;
        } catch (error) {
            this.handleError(error, 'Error al reactivar cliente');
            return false;
        }
    }

    /**
     * Update filters and reload clients
     */
    updateFilters(filters: Partial<ClientFilters>): void {
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
        this.loadClients();
    }

    /**
     * Update pagination and reload clients
     */
    updatePagination(limit: number, offset: number): void {
        this._listState.update((state) => ({
            ...state,
            pagination: { limit, offset },
        }));
        this.loadClients();
    }

    /**
     * Reset filters to default values
     */
    resetFilters(): void {
        this._listState.update((state) => ({
            ...state,
            filters: {
                activeOnly: false,
                clientType: null,
                search: '',
            },
            pagination: {
                ...state.pagination,
                offset: 0,
            },
        }));
        this.loadClients();
    }

    /**
     * Clear current client details
     */
    clearCurrentClient(): void {
        this._detailsState.set({
            client: null,
            loading: false,
            error: null,
        });
    }

    /**
     * Get client session statistics
     * Fetches all sessions for a client and calculates stats
     */
    async getClientSessionStats(clientId: number): Promise<{
        totalSessions: number;
        completedSessions: number;
        canceledSessions: number;
    }> {
        try {
            const response = await listSessionsApiV1SessionsGet({
                query: {
                    client_id: clientId,
                    limit: 1000, // Get all sessions (assuming no client has 1000+ sessions)
                },
            });

            if (response.data) {
                const sessions = response.data.items;
                const totalSessions = sessions.length;
                const completedSessions = sessions.filter((s) => s.status === 'Completed').length;
                const canceledSessions = sessions.filter((s) => s.status === 'Canceled').length;

                return {
                    totalSessions,
                    completedSessions,
                    canceledSessions,
                };
            }

            return {
                totalSessions: 0,
                completedSessions: 0,
                canceledSessions: 0,
            };
        } catch (error) {
            this.handleError(error, 'Error al obtener estadísticas de sesiones');
            return {
                totalSessions: 0,
                completedSessions: 0,
                canceledSessions: 0,
            };
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
                errorMessage = 'Cliente no encontrado';
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
