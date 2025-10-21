/**
 * Item Service
 *
 * Manages catalog items with signals-based state management.
 * Follows Angular 20 best practices: inject(), signals, computed().
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type {
    ItemPublic,
    ItemCreate,
    ItemUpdate,
    PaginatedResponseItemPublic,
    ItemType,
} from '../models/catalog.models';
import type { CatalogFilters } from '../models/catalog.models';

@Injectable({
    providedIn: 'root',
})
export class ItemService {
    private readonly http = inject(HttpClient);
    private readonly notificationService = inject(NotificationService);
    private readonly apiUrl = `${environment.apiUrl}/items`;

    // Private writable signals
    private readonly _items = signal<ItemPublic[]>([]);
    private readonly _total = signal(0);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);
    private readonly _filters = signal<CatalogFilters>({
        skip: 0,
        limit: 50,
        activeOnly: false,
    });

    // Public readonly signals
    readonly items = this._items.asReadonly();
    readonly total = this._total.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly filters = this._filters.asReadonly();

    // Computed signals
    readonly hasItems = computed(() => this._items().length > 0);
    readonly isEmpty = computed(() => !this.loading() && this._items().length === 0);

    /**
     * Load items from API with current filters
     */
    async loadItems(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const filters = this._filters();
            let params = new HttpParams()
                .set('skip', filters.skip?.toString() ?? '0')
                .set('limit', filters.limit?.toString() ?? '50');

            if (filters.search) {
                params = params.set('search', filters.search);
            }

            if (filters.itemType) {
                params = params.set('item_type', filters.itemType);
            }

            if (filters.activeOnly) {
                params = params.set('active_only', 'true');
            }

            const response = await this.http
                .get<PaginatedResponseItemPublic>(this.apiUrl, { params })
                .toPromise();

            if (response) {
                this._items.set(response.items);
                this._total.set(response.total);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al cargar items';
            this._error.set(message);
            this.notificationService.showError(message);
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Create a new item
     */
    async createItem(data: ItemCreate): Promise<ItemPublic | null> {
        this._loading.set(true);

        try {
            const newItem = await this.http.post<ItemPublic>(this.apiUrl, data).toPromise();

            if (newItem) {
                // Reload items to get updated list
                await this.loadItems();
                this.notificationService.showSuccess('Item creado exitosamente');
                return newItem;
            }

            return null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al crear item';
            this.notificationService.showError(message);
            return null;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Update an existing item
     */
    async updateItem(id: number, data: ItemUpdate): Promise<ItemPublic | null> {
        this._loading.set(true);

        try {
            const updatedItem = await this.http
                .patch<ItemPublic>(`${this.apiUrl}/${id}`, data)
                .toPromise();

            if (updatedItem) {
                // Update item in local state
                this._items.update((items) =>
                    items.map((item) => (item.id === id ? updatedItem : item))
                );
                this.notificationService.showSuccess('Item actualizado exitosamente');
                return updatedItem;
            }

            return null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al actualizar item';
            this.notificationService.showError(message);
            return null;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Deactivate an item (soft delete)
     */
    async deactivateItem(id: number): Promise<void> {
        this._loading.set(true);

        try {
            await this.http.patch<ItemPublic>(`${this.apiUrl}/${id}/deactivate`, {}).toPromise();

            // Reload items to reflect changes
            await this.loadItems();
            this.notificationService.showSuccess('Item desactivado exitosamente');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al desactivar item';
            this.notificationService.showError(message);
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Reactivate an item
     */
    async reactivateItem(id: number): Promise<void> {
        this._loading.set(true);

        try {
            await this.http.patch<ItemPublic>(`${this.apiUrl}/${id}/reactivate`, {}).toPromise();

            // Reload items to reflect changes
            await this.loadItems();
            this.notificationService.showSuccess('Item reactivado exitosamente');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al reactivar item';
            this.notificationService.showError(message);
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Update filters and reload items
     */
    updateFilters(newFilters: Partial<CatalogFilters>): void {
        this._filters.update((current) => ({
            ...current,
            ...newFilters,
            // Reset pagination when filters change (except when pagination itself changes)
            skip: newFilters.skip !== undefined ? newFilters.skip : 0,
        }));

        this.loadItems();
    }

    /**
     * Update pagination
     */
    updatePagination(limit: number, skip: number): void {
        this._filters.update((current) => ({
            ...current,
            limit,
            skip,
        }));

        this.loadItems();
    }

    /**
     * Reset all filters to default
     */
    resetFilters(): void {
        this._filters.set({
            skip: 0,
            limit: 50,
            activeOnly: false,
        });

        this.loadItems();
    }
}
