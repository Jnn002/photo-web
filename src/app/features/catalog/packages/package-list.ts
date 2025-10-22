/**
 * Package List Component
 *
 * Displays a table of packages with filtering, search, and pagination.
 * Uses Angular 20 patterns: signals, inject(), input()/output().
 */

import { Component, ChangeDetectionStrategy, inject, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { PackageService } from '../services/package.service';
import type { PackagePublic, SessionType } from '../models/catalog.models';
import {
    SESSION_TYPE_OPTIONS,
    getSessionTypeLabel,
    getSessionTypeSeverity,
    getStatusLabel,
    getStatusSeverity,
} from '../models/catalog.models';

@Component({
    selector: 'app-package-list',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        Select,
        TagModule,
        TooltipModule,
        ConfirmDialogModule,
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './package-list.html',
    styleUrl: './package-list.css',
})
export class PackageListComponent {
    private readonly packageService = inject(PackageService);
    private readonly confirmationService = inject(ConfirmationService);

    // Outputs
    readonly createPackage = output<void>();
    readonly editPackage = output<PackagePublic>();
    readonly viewItems = output<PackagePublic>();

    // Expose service signals
    readonly packages = this.packageService.packages;
    readonly total = this.packageService.total;
    readonly loading = this.packageService.loading;
    readonly filters = this.packageService.filters;

    // Local UI state
    readonly searchTerm = signal('');
    readonly selectedSessionType = signal<SessionType | null>(null);
    readonly showActiveOnly = signal(false);

    // Options
    readonly sessionTypeOptions = SESSION_TYPE_OPTIONS;

    // Helper functions
    readonly getSessionTypeLabel = getSessionTypeLabel;
    readonly getSessionTypeSeverity = getSessionTypeSeverity;
    readonly getStatusLabel = getStatusLabel;
    readonly getStatusSeverity = getStatusSeverity;

    constructor() {
        // Load packages on component initialization
        effect(() => {
            this.packageService.loadPackages();
        });
    }

    /**
     * Handle search input change
     */
    onSearchChange(value: string): void {
        this.searchTerm.set(value);
        this.packageService.updateFilters({ search: value });
    }

    /**
     * Handle session type filter change
     */
    onSessionTypeChange(value: SessionType | null): void {
        this.selectedSessionType.set(value);
        this.packageService.updateFilters({ sessionType: value });
    }

    /**
     * Handle active only filter change
     */
    onActiveOnlyChange(value: boolean): void {
        this.showActiveOnly.set(value);
        this.packageService.updateFilters({ activeOnly: value });
    }

    /**
     * Handle table pagination
     */
    onPageChange(event: TablePageEvent): void {
        const skip = event.first ?? 0;
        const limit = event.rows ?? 50;
        this.packageService.updatePagination(limit, skip);
    }

    /**
     * Reset all filters
     */
    resetFilters(): void {
        this.searchTerm.set('');
        this.selectedSessionType.set(null);
        this.showActiveOnly.set(false);
        this.packageService.resetFilters();
    }

    /**
     * Refresh the table
     */
    refresh(): void {
        this.packageService.loadPackages();
    }

    /**
     * Emit create event
     */
    onCreate(): void {
        this.createPackage.emit();
    }

    /**
     * Emit edit event
     */
    onEdit(pkg: PackagePublic): void {
        this.editPackage.emit(pkg);
    }

    /**
     * Emit view items event
     */
    onViewItems(pkg: PackagePublic): void {
        this.viewItems.emit(pkg);
    }

    /**
     * Handle package deactivation
     */
    onDeactivate(pkg: PackagePublic): void {
        this.confirmationService.confirm({
            message: `¿Está seguro que desea desactivar el paquete "${pkg.name}"?`,
            header: 'Confirmar Desactivación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, desactivar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: async () => {
                await this.packageService.deactivatePackage(pkg.id);
            },
        });
    }

    /**
     * Handle package reactivation
     */
    onReactivate(pkg: PackagePublic): void {
        this.confirmationService.confirm({
            message: `¿Está seguro que desea reactivar el paquete "${pkg.name}"?`,
            header: 'Confirmar Reactivación',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Sí, reactivar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: async () => {
                await this.packageService.reactivatePackage(pkg.id);
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
}
