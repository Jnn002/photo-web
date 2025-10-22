/**
 * Add Item to Package Dialog Component
 *
 * Modal dialog for adding items to a package with quantity selection.
 * Uses Angular 20 patterns: signals, inject(), input()/output().
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { ItemService } from '../services/item.service';
import { PackageService } from '../services/package.service';
import type { ItemPublic, PackageItemCreate } from '../models/catalog.models';
import { getItemTypeLabel, getItemTypeSeverity } from '../models/catalog.models';

@Component({
  selector: 'app-add-item-to-package-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    Select,
    TagModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-item-to-package-dialog.html',
  styleUrl: './add-item-to-package-dialog.css',
})
export class AddItemToPackageDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemService);
  private readonly packageService = inject(PackageService);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly packageId = input.required<number>();

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly itemAdded = output<void>();

  // Local state
  readonly adding = signal(false);
  readonly availableItems = signal<ItemPublic[]>([]);

  // Form
  readonly form: FormGroup;

  // Computed
  readonly selectedItem = computed(() => {
    const itemId = this.form.get('item_id')?.value;
    return this.availableItems().find((item) => item.id === itemId) ?? null;
  });

  readonly subtotal = computed(() => {
    const item = this.selectedItem();
    const quantity = this.form.get('quantity')?.value ?? 1;
    if (!item) return 0;
    return parseFloat(item.unit_price) * quantity;
  });

  // Helper functions
  readonly getItemTypeLabel = getItemTypeLabel;
  readonly getItemTypeSeverity = getItemTypeSeverity;

  constructor() {
    // Initialize form
    this.form = this.fb.group({
      item_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });

    // Load active items when dialog opens
    effect(() => {
      if (this.visible()) {
        this.loadActiveItems();
      } else {
        this.form.reset({ item_id: null, quantity: 1 });
      }
    });
  }

  /**
   * Load active items for selection
   */
  private async loadActiveItems(): Promise<void> {
    // Update filters to get only active items
    this.itemService.updateFilters({ activeOnly: true, limit: 100, skip: 0 });
    await this.itemService.loadItems();

    // Get items from service
    const items = this.itemService.items();
    this.availableItems.set(items);
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.adding.set(true);

    try {
      const formValue = this.form.value;
      const data: PackageItemCreate = {
        item_id: formValue.item_id,
        quantity: formValue.quantity,
      };

      const result = await this.packageService.addItemToPackage(this.packageId(), data);

      if (result) {
        this.itemAdded.emit();
        this.onCancel();
      }
    } finally {
      this.adding.set(false);
    }
  }

  /**
   * Handle dialog cancel
   */
  onCancel(): void {
    this.form.reset({ item_id: null, quantity: 1 });
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
   * Get item option label for dropdown
   */
  getItemOptionLabel(item: ItemPublic): string {
    return `${item.code} - ${item.name} (${this.formatCurrency(item.unit_price)})`;
  }
}
