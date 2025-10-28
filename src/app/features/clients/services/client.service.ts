/**
 * Client Service
 *
 * Manages client data with signals and integrates with the backend API.
 * Follows Angular 20+ best practices with signals-based state management.
 * Implements caching strategy to reduce backend calls.
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
import { CacheService } from '@core/services/cache';
import type { ClientPublic, ClientCreate, ClientUpdate, ClientType } from '../models/client.models';
import type { ClientListState, ClientDetailsState, ClientFilters } from '../models/client.models';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    private readonly notificationService = inject(NotificationService);
    private readonly cacheService = inject(CacheService);

    // Cache configuration
    private readonly CACHE_TTL = {
        list: 3 * 60 * 1000, // 3 minutes
        detail: 5 * 60 * 1000, // 5 minutes
        stats: 10 * 60 * 1000, // 10 minutes
    };

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

    // Last update timestamp for UI display
    readonly lastUpdate = signal<Date | null>(null);

    /**
     * Build cache key for list queries
     */
    private buildListCacheKey(
        filters: ClientFilters,
        pagination: { limit: number; offset: number }
    ): string {
        const filterKey = `${filters.activeOnly}-${filters.clientType ?? 'all'}-${filters.search}`;
        return `clients:list:${filterKey}:${pagination.limit}:${pagination.offset}`;
    }

    /**
     * Build cache key for client details
     */
    private buildDetailCacheKey(clientId: number): string {
        return `clients:detail:${clientId}`;
    }

    /**
     * Load clients with current filters and pagination
     * @param forceRefresh - If true, bypass cache and fetch from server
     */
    async loadClients(forceRefresh = false): Promise<void> {
        const currentState = this._listState();
        const cacheKey = this.buildListCacheKey(currentState.filters, currentState.pagination);

        // Try cache first if not forcing refresh
        if (!forceRefresh) {
            const cached = this.cacheService.get<{ items: ClientPublic[]; total: number }>(
                cacheKey
            );
            if (cached) {
                this._listState.update((state) => ({
                    ...state,
                    items: cached.items,
                    total: cached.total,
                    loading: false,
                }));
                return;
            }
        }

        // Fetch from server
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
                // Cache the response
                this.cacheService.set(cacheKey, response.data, {
                    ttl: this.CACHE_TTL.list,
                });

                this._listState.update((state) => ({
                    ...state,
                    items: response.data.items,
                    total: response.data.total,
                    loading: false,
                }));

                this.lastUpdate.set(new Date());
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
     * @param clientId - Client ID to load
     * @param forceRefresh - If true, bypass cache and fetch from server
     */
    async loadClient(clientId: number, forceRefresh = false): Promise<void> {
        const cacheKey = this.buildDetailCacheKey(clientId);

        // Try cache first if not forcing refresh
        if (!forceRefresh) {
            const cached = this.cacheService.get<ClientPublic>(cacheKey);
            if (cached) {
                this._detailsState.update((state) => ({
                    ...state,
                    client: cached,
                    loading: false,
                }));
                return;
            }
        }

        // Fetch from server
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
                // Cache the response
                this.cacheService.set(cacheKey, response.data, {
                    ttl: this.CACHE_TTL.detail,
                });

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

                // Invalidate list cache
                this.cacheService.invalidatePattern('clients:list:*');

                await this.loadClients(true); // Force refresh
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

                // Invalidate both list and detail caches
                this.cacheService.invalidatePattern('clients:list:*');
                this.cacheService.invalidate(this.buildDetailCacheKey(clientId));

                await this.loadClients(true); // Force refresh list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId, true); // Force refresh details if viewing this client
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

                // Invalidate caches
                this.cacheService.invalidatePattern('clients:list:*');
                this.cacheService.invalidate(this.buildDetailCacheKey(clientId));

                await this.loadClients(true); // Force refresh list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId, true); // Force refresh details if viewing this client
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

                // Invalidate caches
                this.cacheService.invalidatePattern('clients:list:*');
                this.cacheService.invalidate(this.buildDetailCacheKey(clientId));

                await this.loadClients(true); // Force refresh list
                if (this._detailsState().client?.id === clientId) {
                    await this.loadClient(clientId, true); // Force refresh details if viewing this client
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
        // Force refresh when filters change to get new data
        this.loadClients(true);
    }

    /**
     * Update pagination and reload clients
     */
    updatePagination(limit: number, offset: number): void {
        this._listState.update((state) => ({
            ...state,
            pagination: { limit, offset },
        }));
        // Normal load (will use cache if available)
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
        // Force refresh to get all data
        this.loadClients(true);
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
