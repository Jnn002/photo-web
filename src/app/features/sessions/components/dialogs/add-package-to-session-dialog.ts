import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { SessionService } from '../../services/session.service';
import { PackageService } from '../../../catalog/services/package.service';
import { NotificationService } from '../../../../core/services/notification';
import type { PackagePublic, PackageItemDetail } from '../../../catalog/models/catalog.models';
import type { SessionType } from '../../models/session.models';

interface PackageOption {
    label: string;
    value: number;
    package: PackagePublic;
}

@Component({
    selector: 'app-add-package-to-session-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        Select,
        MessageModule,
        TableModule,
    ],
    templateUrl: './add-package-to-session-dialog.html',
    styleUrl: './add-package-to-session-dialog.css',
})
export class AddPackageToSessionDialogComponent implements OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly packageService = inject(PackageService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    readonly selectedPackage = signal<PackagePublic | null>(null);
    readonly packageItems = signal<PackageItemDetail[]>([]);
    readonly loadingPackageDetails = signal(false);
    private readonly loaded = signal(false);

    // Get package options from PackageService
    readonly packageOptions = computed(() =>
        this.packageService.packages().map((pkg) => ({
            label: `${pkg.code} - ${pkg.name}`,
            value: pkg.id,
            package: pkg,
        }))
    );

    readonly loading = this.packageService.loading;

    constructor() {
        // Initialize form
        this.form = this.fb.group({
            package_id: [null, Validators.required],
        });

        // Watch for package selection changes
        this.form.get('package_id')?.valueChanges.subscribe(async (packageId) => {
            if (packageId) {
                const selectedOption = this.packageOptions().find((opt) => opt.value === packageId);
                this.selectedPackage.set(selectedOption?.package || null);

                // Load package details with items
                await this.loadPackageItems(packageId);
            } else {
                this.selectedPackage.set(null);
                this.packageItems.set([]);
            }
        });

        // Load packages filtered by session type
        effect(() => {
            if (!this.loaded()) {
                const sessionType = this.config.data.sessionType as SessionType;
                // Filter packages by session type to show only compatible ones
                this.packageService.updateFilters({
                    sessionType: sessionType,
                    activeOnly: true
                });
                this.loaded.set(true);
            }
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;
            const packageId = this.form.value.package_id;

            this.sessionService.addPackageToSession(sessionId, packageId).subscribe({
                next: () => {
                    this.notificationService.showSuccess(
                        'Package agregado exitosamente (items expandidos)'
                    );
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error adding package to session:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al agregar package'
                    );
                    this.submitting.set(false);
                },
            });
        } else {
            Object.keys(this.form.controls).forEach((key) => {
                this.form.get(key)?.markAsTouched();
            });
        }
    }

    cancel() {
        this.ref.close(false);
    }

    async loadPackageItems(packageId: number): Promise<void> {
        this.loadingPackageDetails.set(true);
        try {
            const packageDetail = await this.packageService.getPackageWithItems(packageId);
            if (packageDetail && packageDetail.items) {
                this.packageItems.set(packageDetail.items);
            } else {
                this.packageItems.set([]);
            }
        } catch (error) {
            console.error('Error loading package items:', error);
            this.packageItems.set([]);
        } finally {
            this.loadingPackageDetails.set(false);
        }
    }

    formatCurrency(amount: number): string {
        return amount.toFixed(2);
    }

    // Helper to parse string to float for template
    parseFloat(value: string): number {
        return parseFloat(value);
    }

    ngOnDestroy() {
        // Reset filters when dialog closes to not affect other catalog views
        this.packageService.resetFilters();
    }
}
