/**
 * Items Container Component
 *
 * Main component for items management, integrating list and form.
 */

import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ItemListComponent } from './item-list';
import { ItemFormComponent } from './item-form';
import type { ItemPublic } from '../models/catalog.models';

@Component({
  selector: 'app-items',
  imports: [ItemListComponent, ItemFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-item-list
      (createClicked)="onCreateItem()"
      (editClicked)="onEditItem($event)"
      (viewClicked)="onViewItem($event)"
    />

    <app-item-form
      [visible]="formVisible()"
      [item]="selectedItem()"
      (visibleChange)="onFormVisibleChange($event)"
      (saved)="onItemSaved($event)"
    />
  `,
})
export class ItemsComponent {
  readonly formVisible = signal(false);
  readonly selectedItem = signal<ItemPublic | null>(null);

  onCreateItem(): void {
    this.selectedItem.set(null);
    this.formVisible.set(true);
  }

  onEditItem(item: ItemPublic): void {
    this.selectedItem.set(item);
    this.formVisible.set(true);
  }

  onViewItem(item: ItemPublic): void {
    // TODO: Implement view details dialog
    console.log('View item:', item);
  }

  onFormVisibleChange(visible: boolean): void {
    this.formVisible.set(visible);
    if (!visible) {
      this.selectedItem.set(null);
    }
  }

  onItemSaved(item: ItemPublic): void {
    this.formVisible.set(false);
    this.selectedItem.set(null);
  }
}
