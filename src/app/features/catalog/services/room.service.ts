/**
 * Room Service
 *
 * Manages studio rooms with signals-based state management.
 * Follows Angular 20 best practices: inject(), signals, computed().
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type {
  RoomPublic,
  RoomCreate,
  RoomUpdate,
  PaginatedResponseRoomPublic,
} from '../models/catalog.models';
import type { CatalogFilters } from '../models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly apiUrl = `${environment.apiUrl}/rooms`;

  // Private writable signals
  private readonly _rooms = signal<RoomPublic[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<CatalogFilters>({
    skip: 0,
    limit: 50,
    activeOnly: false,
  });

  // Public readonly signals
  readonly rooms = this._rooms.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();

  // Computed signals
  readonly hasRooms = computed(() => this._rooms().length > 0);
  readonly isEmpty = computed(() => !this.loading() && this._rooms().length === 0);

  /**
   * Load rooms from API with current filters
   */
  async loadRooms(): Promise<void> {
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

      if (filters.activeOnly) {
        params = params.set('active_only', 'true');
      }

      const response = await this.http
        .get<PaginatedResponseRoomPublic>(this.apiUrl, { params })
        .toPromise();

      if (response) {
        this._rooms.set(response.items);
        this._total.set(response.total);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar salas';
      this._error.set(message);
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a new room
   */
  async createRoom(data: RoomCreate): Promise<RoomPublic | null> {
    this._loading.set(true);

    try {
      const newRoom = await this.http.post<RoomPublic>(this.apiUrl, data).toPromise();

      if (newRoom) {
        // Reload rooms to get updated list
        await this.loadRooms();
        this.notificationService.showSuccess('Sala creada exitosamente');
        return newRoom;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear sala';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update an existing room
   */
  async updateRoom(id: number, data: RoomUpdate): Promise<RoomPublic | null> {
    this._loading.set(true);

    try {
      const updatedRoom = await this.http
        .patch<RoomPublic>(`${this.apiUrl}/${id}`, data)
        .toPromise();

      if (updatedRoom) {
        // Update room in local state
        this._rooms.update((rooms) =>
          rooms.map((room) => (room.id === id ? updatedRoom : room))
        );
        this.notificationService.showSuccess('Sala actualizada exitosamente');
        return updatedRoom;
      }

      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar sala';
      this.notificationService.showError(message);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Deactivate a room (soft delete)
   */
  async deactivateRoom(id: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.delete<RoomPublic>(`${this.apiUrl}/${id}`, {}).toPromise();

      // Reload rooms to reflect changes
      await this.loadRooms();
      this.notificationService.showSuccess('Sala desactivada exitosamente');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al desactivar sala';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Reactivate a room
   */
  async reactivateRoom(id: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.put<RoomPublic>(`${this.apiUrl}/${id}/reactivate`, {}).toPromise();

      // Reload rooms to reflect changes
      await this.loadRooms();
      this.notificationService.showSuccess('Sala reactivada exitosamente');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al reactivar sala';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Set room to maintenance status
   */
  async setMaintenance(id: number): Promise<void> {
    this._loading.set(true);

    try {
      await this.http.put<RoomPublic>(`${this.apiUrl}/${id}/maintenance`, {}).toPromise();

      // Reload rooms to reflect changes
      await this.loadRooms();
      this.notificationService.showSuccess('Sala marcada en mantenimiento');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al cambiar estado de sala';
      this.notificationService.showError(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update filters and reload rooms
   */
  updateFilters(newFilters: Partial<CatalogFilters>): void {
    this._filters.update((current) => ({
      ...current,
      ...newFilters,
      // Reset pagination when filters change (except when pagination itself changes)
      skip: newFilters.skip !== undefined ? newFilters.skip : 0,
    }));

    this.loadRooms();
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

    this.loadRooms();
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

    this.loadRooms();
  }
}
