/**
 * Packages Component (Container)
 *
 * Main container component for package management.
 * Manages state and coordinates between child components.
 */

import { Component, ChangeDetectionStrategy, signal, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PackageListComponent } from './package-list';
import { PackageFormComponent } from './package-form';
import { PackageDetailDialogComponent } from './package-detail-dialog';
import { AddItemToPackageDialogComponent } from './add-item-to-package-dialog';
import { PackageItemsManagerComponent } from './package-items-manager';
import { PackageService } from '../services/package.service';
import type { PackagePublic } from '../models/catalog.models';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-packages',
    imports: [
        CommonModule,
        PackageListComponent,
        PackageFormComponent,
        PackageDetailDialogComponent,
        AddItemToPackageDialogComponent,
        PackageItemsManagerComponent,
        DialogModule,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './packages.html',
    styleUrl: './packages.css',
})
export class PackagesComponent {
    readonly packageService = inject(PackageService);

    // ViewChild to access embedded form
    readonly embeddedForm = viewChild<PackageFormComponent>('embeddedForm');

    // Dialog visibility
    readonly showPackageForm = signal(false);
    readonly showDetailDialog = signal(false);
    readonly showEditWithItemsDialog = signal(false);
    readonly showAddItemDialog = signal(false);

    // Selected package for editing
    readonly selectedPackage = signal<PackagePublic | null>(null);

    // Saving state
    readonly savingPackage = signal(false);

    /**
     * Handle create package
     */
    onCreatePackage(): void {
        this.selectedPackage.set(null);
        this.showPackageForm.set(true);
    }

    /**
     * Handle edit package (simple edit, no items)
     */
    onEditPackage(pkg: PackagePublic): void {
        this.selectedPackage.set(pkg);
        this.showPackageForm.set(true);
    }

    /**
     * Handle view items (opens edit with items dialog)
     */
    async onViewItems(pkg: PackagePublic): Promise<void> {
        // Close any other dialogs first
        this.showPackageForm.set(false);
        this.showDetailDialog.set(false);

        this.selectedPackage.set(pkg);
        await this.packageService.getPackageWithItems(pkg.id);
        this.showEditWithItemsDialog.set(true);
    }

    /**
     * Handle package saved
     */
    onPackageSaved(): void {
        // Reload the current package if we're viewing items
        if (this.showEditWithItemsDialog() && this.selectedPackage()) {
            this.packageService.getPackageWithItems(this.selectedPackage()!.id);
        }
    }

    /**
     * Handle add item to package
     */
    onAddItemToPackage(): void {
        this.showAddItemDialog.set(true);
    }

    /**
     * Handle item added to package
     */
    async onItemAdded(): Promise<void> {
        // Reload package items
        if (this.selectedPackage()) {
            await this.packageService.getPackageWithItems(this.selectedPackage()!.id);
        }
    }

    /**
     * Handle close edit with items dialog
     */
    onCloseEditWithItems(): void {
        this.showEditWithItemsDialog.set(false);
        this.showAddItemDialog.set(false);
        this.packageService.clearCurrentPackage();
        this.selectedPackage.set(null);
    }

    /**
     * Handle embedded form close (prevent closing parent dialog)
     */
    handleEmbeddedFormClose(visible: boolean): void {
        // Don't close the parent dialog when embedded form closes
        // This is handled by the parent dialog's close button
    }

    /**
     * Handle save package changes (called from button in template)
     */
    async onSavePackageChanges(): Promise<void> {
        const form = this.embeddedForm();
        if (!form) return;

        this.savingPackage.set(true);
        try {
            await form.submitForm();
        } finally {
            this.savingPackage.set(false);
        }
    }
}
