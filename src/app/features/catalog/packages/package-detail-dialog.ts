/**
 * Package Detail Dialog Component
 *
 * Read-only modal dialog for viewing package details with included items.
 * Uses Angular 20 patterns: signals, inject(), input()/output().
 */

import { Component, ChangeDetectionStrategy, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type { PackageDetail, PackageItemDetail } from '../models/catalog.models';
import {
  getSessionTypeLabel,
  getSessionTypeSeverity,
  getStatusLabel,
  getStatusSeverity,
  getItemTypeLabel,
  getItemTypeSeverity,
} from '../models/catalog.models';

@Component({
  selector: 'app-package-detail-dialog',
  imports: [CommonModule, DialogModule, ButtonModule, TableModule, TagModule, DividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './package-detail-dialog.html',
  styleUrl: './package-detail-dialog.css',
})
export class PackageDetailDialogComponent {
  // Inputs
  readonly visible = input.required<boolean>();
  readonly package = input<PackageDetail | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();

  // Computed
  readonly items = computed(() => this.package()?.items ?? []);
  readonly itemsCount = computed(() => this.items().length);
  readonly itemsSubtotal = computed(() =>
    this.items().reduce((sum, item) => {
      const price = parseFloat(item.item_unit_price);
      return sum + price * item.quantity;
    }, 0)
  );

  // Helper functions
  readonly getSessionTypeLabel = getSessionTypeLabel;
  readonly getSessionTypeSeverity = getSessionTypeSeverity;
  readonly getStatusLabel = getStatusLabel;
  readonly getStatusSeverity = getStatusSeverity;
  readonly getItemTypeLabel = getItemTypeLabel;
  readonly getItemTypeSeverity = getItemTypeSeverity;

  /**
   * Handle dialog close
   */
  onClose(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Format currency
   */
  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `Q ${numValue.toFixed(2)}`;
  }

  /**
   * Format date
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calculate item subtotal
   */
  getItemSubtotal(item: PackageItemDetail): number {
    return parseFloat(item.item_unit_price) * item.quantity;
  }

  /**
   * Parse string to float
   */
  parseFloat(value: string): number {
    return parseFloat(value);
  }
}
