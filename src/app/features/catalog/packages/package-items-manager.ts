/**
 * Package Items Manager Component
 *
 * Manages items within a package (add, remove, view).
 * Uses Angular 20 patterns: signals, inject(), input()/output().
 */

import { Component, ChangeDetectionStrategy, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { PackageService } from '../services/package.service';
import type { PackageItemDetail } from '../models/catalog.models';
import { getItemTypeLabel, getItemTypeSeverity } from '../models/catalog.models';

@Component({
  selector: 'app-package-items-manager',
  imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './package-items-manager.html',
  styleUrl: './package-items-manager.css',
})
export class PackageItemsManagerComponent {
  private readonly packageService = inject(PackageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Inputs
  readonly packageId = input.required<number>();

  // Outputs
  readonly addItem = output<void>();

  // Expose service signals
  readonly items = this.packageService.packageItems;
  readonly loading = this.packageService.loading;

  // Computed
  readonly itemsCount = computed(() => this.items().length);
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => {
      const price = parseFloat(item.item_unit_price);
      return sum + price * item.quantity;
    }, 0)
  );

  // Helper functions
  readonly getItemTypeLabel = getItemTypeLabel;
  readonly getItemTypeSeverity = getItemTypeSeverity;

  /**
   * Emit add item event
   */
  onAddItem(): void {
    this.addItem.emit();
  }

  /**
   * Handle item removal
   */
  onRemoveItem(item: PackageItemDetail): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea remover "${item.item_name}" del paquete?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: async () => {
        await this.packageService.removeItemFromPackage(this.packageId(), item.item_id);
      },
    });
  }

  /**
   * Format currency
   */
  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `Q ${numValue.toFixed(2)}`;
  }

  /**
   * Calculate item subtotal
   */
  getItemSubtotal(item: PackageItemDetail): number {
    return parseFloat(item.item_unit_price) * item.quantity;
  }
}
