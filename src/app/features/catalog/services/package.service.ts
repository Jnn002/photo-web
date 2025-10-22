/**
 * Package Service
 *
 * Manages catalog packages with signals-based state management.
 * Follows Angular 20 best practices: inject(), signals, computed().
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type {
  PackagePublic,
  PackageCreate,
  PackageUpdate,
  PackageDetail,
  PackageItemCreate,
  PackageItemDetail,
  PaginatedResponsePackagePublic,
  SessionType,
} from '../models/catalog.models';
import type { CatalogFilters } from '../models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class PackageService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly apiUrl = `${environment.apiUrl}/packages`;

  // Private writable signals
  private readonly _packages = signal<PackagePublic[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<CatalogFilters>({
    skip: 0,
    limit: 50,
    activeOnly: false,
  });

  // Current package detail (when viewing/editing)
  private readonly _currentPackage = signal<PackageDetail | null>(null);
  private readonly _packageItems = signal<PackageItemDetail[]>([]);

  // Public readonly signals
  readonly packages = this._packages.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly currentPackage = this._currentPackage.asReadonly();
  readonly packageItems = this._packageItems.asReadonly();

  // Computed signals
  readonly hasPackages = computed(() => this._packages().length > 0);
  readonly isEmpty = computed(() => !this.loading() && this._packages().length === 0);
  readonly itemsSubtotal = computed(() =>
    this._packageItems().reduce((sum, item) => {
      const price = parseFloat(item.item_unit_price);
      return sum + price * item.quantity;
    }, 0)
  );

  /**
   * Load packages from API with current filters
   */
  async loadPackages(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const filters = this._filters();
      let params = new HttpParams()
        .set('offset', filters.skip?.toString() ?? '0')
        .set('limit', filters.limit?.toString() ?? '50');

      if (filters.search) {
        params = params.set('search', filters.search);
      }

      if (filters.sessionType) {
        params = params.set('session_type', filters.sessionType);
      }

      if (filters.activeOnly) {
        params = params.set('active_only', 'true');
      }

      const response = await this.http
        .get<PaginatedResponsePackagePublic>(this.apiUrl, { params })
        .toPromise();

      if (response) {
        this._packages.set(response.items);
        this._total.set(response.total);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar paquetes';
      this._error.set(message);
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a new package
   */
  async createPackage(data: PackageCreate): Promise<PackagePublic | null> {
    this._loading.set(true);

    try {
      const newPackage = await this.http.post<PackagePublic>(this.apiUrl, data).toPromise();

      if (newPackage) {
        // Reload packages to get updated list
        await this.loadPackages();
        this.notificationService.showSuccess('Paquete creado exitosamente');
        return newPackage;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear paquete';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update an existing package
   */
  async updatePackage(id: number, data: PackageUpdate): Promise<PackagePublic | null> {
    this._loading.set(true);

    try {
      const updatedPackage = await this.http
        .patch<PackagePublic>(`${this.apiUrl}/${id}`, data)
        .toPromise();

      if (updatedPackage) {
        // Update package in local state
        this._packages.update((packages) =>
          packages.map((pkg) => (pkg.id === id ? updatedPackage : pkg))
        );

        // Update current package if it's the one being viewed
        if (this._currentPackage()?.id === id) {
          this._currentPackage.update((current) =>
            current ? { ...current, ...updatedPackage } : null
          );
        }

        this.notificationService.showSuccess('Paquete actualizado exitosamente');
        return updatedPackage;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar paquete';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Deactivate a package (soft delete)
   */
  async deactivatePackage(id: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.delete<PackagePublic>(`${this.apiUrl}/${id}`, {}).toPromise();

      // Reload packages to reflect changes
      await this.loadPackages();
      this.notificationService.showSuccess('Paquete desactivado exitosamente');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al desactivar paquete';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Reactivate a package
   */
  async reactivatePackage(id: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.put<PackagePublic>(`${this.apiUrl}/${id}/reactivate`, {}).toPromise();

      // Reload packages to reflect changes
      await this.loadPackages();
      this.notificationService.showSuccess('Paquete reactivado exitosamente');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al reactivar paquete';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get package with items by ID
   */
  async getPackageWithItems(id: number): Promise<PackageDetail | null> {
    this._loading.set(true);

    try {
      const packageDetail = await this.http.get<PackageDetail>(`${this.apiUrl}/${id}`).toPromise();

      if (packageDetail) {
        this._currentPackage.set(packageDetail);
        this._packageItems.set(packageDetail.items ?? []);
        return packageDetail;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar paquete';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Add item to package
   */
  async addItemToPackage(
    packageId: number,
    data: PackageItemCreate
  ): Promise<PackageItemDetail | null> {
    this._loading.set(true);

    try {
      const packageItem = await this.http
        .post<PackageItemDetail>(`${this.apiUrl}/${packageId}/items`, data)
        .toPromise();

      if (packageItem) {
        // Add item to local state
        this._packageItems.update((items) => [...items, packageItem]);
        this.notificationService.showSuccess('Item agregado al paquete');
        return packageItem;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al agregar item al paquete';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Remove item from package
   */
  async removeItemFromPackage(packageId: number, itemId: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.delete(`${this.apiUrl}/${packageId}/items/${itemId}`).toPromise();

      // Remove item from local state
      this._packageItems.update((items) => items.filter((item) => item.item_id !== itemId));
      this.notificationService.showSuccess('Item removido del paquete');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al remover item del paquete';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update filters and reload packages
   */
  updateFilters(newFilters: Partial<CatalogFilters>): void {
    this._filters.update((current) => ({
      ...current,
      ...newFilters,
      // Reset pagination when filters change (except when pagination itself changes)
      skip: newFilters.skip !== undefined ? newFilters.skip : 0,
    }));

    this.loadPackages();
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

    this.loadPackages();
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

    this.loadPackages();
  }

  /**
   * Clear current package state
   */
  clearCurrentPackage(): void {
    this._currentPackage.set(null);
    this._packageItems.set([]);
  }
}
