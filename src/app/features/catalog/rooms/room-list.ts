/**
 * Room List Component
 *
 * Displays studio rooms in a table with filters, search, and CRUD operations.
 * Uses Angular 20 patterns: standalone, signals, inject(), OnPush change detection.
 */

import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports (v20+ naming)
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { RoomService } from '../services/room.service';
import type { RoomPublic } from '../models/catalog.models';
import { getRoomStatusLabel, getRoomStatusSeverity } from '../models/catalog.models';

@Component({
  selector: 'app-room-list',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    TagModule,
    ConfirmDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  templateUrl: './room-list.html',
  styleUrl: './room-list.css',
})
export class RoomListComponent {
  private readonly roomService = inject(RoomService);
  private readonly confirmationService = inject(ConfirmationService);

  // Expose service state
  readonly rooms = this.roomService.rooms;
  readonly total = this.roomService.total;
  readonly loading = this.roomService.loading;
  readonly filters = this.roomService.filters;

  // Local UI state
  readonly searchTerm = signal('');
  readonly showActiveOnly = signal(false);

  // Output events for parent component
  readonly createClicked = output<void>();
  readonly editClicked = output<RoomPublic>();
  readonly availabilityClicked = output<RoomPublic>();

  // Helper functions for template
  readonly getRoomStatusLabel = getRoomStatusLabel;
  readonly getRoomStatusSeverity = getRoomStatusSeverity;

  constructor() {
    // Load initial data
    this.roomService.loadRooms();
  }

  /**
   * Handle search input changes
   */
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.roomService.updateFilters({ search: value });
  }

  /**
   * Handle active only filter toggle
   */
  onActiveOnlyChange(value: boolean): void {
    this.showActiveOnly.set(value);
    this.roomService.updateFilters({ activeOnly: value });
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    this.createClicked.emit();
  }

  /**
   * Handle edit button click
   */
  onEdit(room: RoomPublic): void {
    this.editClicked.emit(room);
  }

  /**
   * Handle availability button click
   */
  onViewAvailability(room: RoomPublic): void {
    this.availabilityClicked.emit(room);
  }

  /**
   * Handle delete/deactivate with confirmation
   */
  onDelete(room: RoomPublic): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de desactivar la sala "${room.name}"?`,
      header: 'Confirmar Desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.roomService.deactivateRoom(room.id);
      },
    });
  }

  /**
   * Handle reactivate with confirmation
   */
  onReactivate(room: RoomPublic): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de reactivar la sala "${room.name}"?`,
      header: 'Confirmar Reactivación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.roomService.reactivateRoom(room.id);
      },
    });
  }

  /**
   * Handle set maintenance with confirmation
   */
  onSetMaintenance(room: RoomPublic): void {
    this.confirmationService.confirm({
      message: `¿Marcar la sala "${room.name}" como en mantenimiento?`,
      header: 'Cambiar a Mantenimiento',
      icon: 'pi pi-wrench',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.roomService.setMaintenance(room.id);
      },
    });
  }

  /**
   * Handle table pagination
   */
  onPageChange(event: { first?: number | null; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? 50;
    this.roomService.updatePagination(rows, first);
  }

  /**
   * Refresh the room list
   */
  refresh(): void {
    this.roomService.loadRooms();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.searchTerm.set('');
    this.showActiveOnly.set(false);
    this.roomService.resetFilters();
  }
}
