/**
 * Item List Component
 *
 * Displays catalog items in a table with filters, search, and CRUD operations.
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

import { ItemService } from '../services/item.service';
import type { ItemPublic, ItemType } from '../models/catalog.models';
import {
  ITEM_TYPE_OPTIONS,
  getItemTypeLabel,
  getItemTypeSeverity,
  getStatusLabel,
  getStatusSeverity,
} from '../models/catalog.models';

@Component({
  selector: 'app-item-list',
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
  templateUrl: './item-list.html',
  styleUrl: './item-list.css',
})
export class ItemListComponent {
  private readonly itemService = inject(ItemService);
  private readonly confirmationService = inject(ConfirmationService);

  // Expose service state
  readonly items = this.itemService.items;
  readonly total = this.itemService.total;
  readonly loading = this.itemService.loading;
  readonly filters = this.itemService.filters;

  // Local UI state
  readonly searchTerm = signal('');
  readonly selectedItemType = signal<ItemType | null>(null);
  readonly showActiveOnly = signal(false);

  // Output events for parent component
  readonly createClicked = output<void>();
  readonly editClicked = output<ItemPublic>();
  readonly viewClicked = output<ItemPublic>();

  // Item type options for dropdown
  readonly itemTypeOptions = [{ label: 'Todos', value: null }, ...ITEM_TYPE_OPTIONS];

  // Helper functions for template
  readonly getItemTypeLabel = getItemTypeLabel;
  readonly getItemTypeSeverity = getItemTypeSeverity;
  readonly getStatusLabel = getStatusLabel;
  readonly getStatusSeverity = getStatusSeverity;

  constructor() {
    // Load initial data
    this.itemService.loadItems();
  }

  /**
   * Handle search input changes
   */
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.itemService.updateFilters({ search: value });
  }

  /**
   * Handle item type filter changes
   */
  onItemTypeChange(value: ItemType | null): void {
    this.selectedItemType.set(value);
    this.itemService.updateFilters({ itemType: value });
  }

  /**
   * Handle active only filter toggle
   */
  onActiveOnlyChange(value: boolean): void {
    this.showActiveOnly.set(value);
    this.itemService.updateFilters({ activeOnly: value });
  }

  /**
   * Handle create button click
   */
  onCreate(): void {
    this.createClicked.emit();
  }

  /**
   * Handle view button click
   */
  onView(item: ItemPublic): void {
    this.viewClicked.emit(item);
  }

  /**
   * Handle edit button click
   */
  onEdit(item: ItemPublic): void {
    this.editClicked.emit(item);
  }

  /**
   * Handle delete/deactivate with confirmation
   */
  onDelete(item: ItemPublic): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de desactivar el item "${item.name}"?`,
      header: 'Confirmar Desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.itemService.deactivateItem(item.id);
      },
    });
  }

  /**
   * Handle reactivate with confirmation
   */
  onReactivate(item: ItemPublic): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de reactivar el item "${item.name}"?`,
      header: 'Confirmar Reactivación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.itemService.reactivateItem(item.id);
      },
    });
  }

  /**
   * Handle table pagination
   */
  onPageChange(event: { first?: number | null; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? 50;
    this.itemService.updatePagination(rows, first);
  }

  /**
   * Refresh the item list
   */
  refresh(): void {
    this.itemService.loadItems();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedItemType.set(null);
    this.showActiveOnly.set(false);
    this.itemService.resetFilters();
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(numValue);
  }
}
