/**
 * Item Detail Dialog Component
 *
 * Displays detailed information of a catalog item in a dialog modal.
 * Uses Angular 20 patterns: standalone, signals, input(), output(), OnPush change detection.
 */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import type { ItemPublic } from '../models/catalog.models';
import {
  getItemTypeLabel,
  getItemTypeSeverity,
  getStatusLabel,
  getStatusSeverity,
} from '../models/catalog.models';

@Component({
  selector: 'app-item-detail-dialog',
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-detail-dialog.html',
  styleUrl: './item-detail-dialog.css',
})
export class ItemDetailDialogComponent {
  // Inputs
  readonly visible = input<boolean>(false);
  readonly item = input<ItemPublic | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();

  // Helper functions for template
  readonly getItemTypeLabel = getItemTypeLabel;
  readonly getItemTypeSeverity = getItemTypeSeverity;
  readonly getStatusLabel = getStatusLabel;
  readonly getStatusSeverity = getStatusSeverity;

  /**
   * Handle dialog close
   */
  onHide(): void {
    this.visibleChange.emit(false);
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

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
