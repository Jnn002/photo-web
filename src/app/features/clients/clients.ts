/**
 * Clients List Component
 *
 * Main component for displaying and managing clients.
 * Features: search, filter, pagination, and CRUD operations.
 */

import { Component, ChangeDetectionStrategy, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { ClientService } from './services/client.service';
import type { ClientPublic, ClientType } from './models/client.models';
import {
    CLIENT_TYPE_OPTIONS,
    getClientTypeLabel,
    getClientTypeSeverity,
    getStatusLabel,
    getStatusSeverity,
} from './models/client.models';

@Component({
    selector: 'app-clients',
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
    templateUrl: './clients.html',
    styleUrl: './clients.css',
})
export class ClientsComponent {
    private readonly clientService = inject(ClientService);
    private readonly router = inject(Router);
    private readonly confirmationService = inject(ConfirmationService);

    // Expose service state via computed
    readonly clients = this.clientService.items;
    readonly total = this.clientService.total;
    readonly loading = this.clientService.loading;
    readonly filters = this.clientService.filters;

    // Local UI state
    readonly searchTerm = signal('');
    readonly selectedClientType = signal<ClientType | null>(null);
    readonly showActiveOnly = signal(false);

    // Client type options for dropdown
    readonly clientTypeOptions = [{ label: 'Todos', value: null }, ...CLIENT_TYPE_OPTIONS];

    // Helper functions exposed to template
    readonly getClientTypeLabel = getClientTypeLabel;
    readonly getClientTypeSeverity = getClientTypeSeverity;
    readonly getStatusLabel = getStatusLabel;
    readonly getStatusSeverity = getStatusSeverity;

    // Load clients on component initialization
    constructor() {
        // Load initial data
        this.clientService.loadClients();
    }

    /**
     * Handle search input changes
     */
    onSearchChange(value: string): void {
        this.searchTerm.set(value);
        this.clientService.updateFilters({ search: value });
    }

    /**
     * Handle client type filter changes
     */
    onClientTypeChange(value: ClientType | null): void {
        this.selectedClientType.set(value);
        this.clientService.updateFilters({ clientType: value });
    }

    /**
     * Handle active only filter toggle
     */
    onActiveOnlyChange(value: boolean): void {
        this.showActiveOnly.set(value);
        this.clientService.updateFilters({ activeOnly: value });
    }

    /**
     * Navigate to create client form
     */
    createClient(): void {
        this.router.navigate(['/clients/new']);
    }

    /**
     * Navigate to client details page
     */
    viewClient(client: ClientPublic): void {
        this.router.navigate(['/clients', client.id]);
    }

    /**
     * Navigate to edit client form
     */
    editClient(client: ClientPublic): void {
        this.router.navigate(['/clients', client.id, 'edit']);
    }

    /**
     * Deactivate a client with confirmation
     */
    deleteClient(client: ClientPublic): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de desactivar al cliente "${client.full_name}"?`,
            header: 'Confirmar Desactivación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, desactivar',
            rejectLabel: 'Cancelar',
            accept: async () => {
                await this.clientService.deactivateClient(client.id);
            },
        });
    }

    /**
     * Reactivate a client with confirmation
     */
    reactivateClient(client: ClientPublic): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de reactivar al cliente "${client.full_name}"?`,
            header: 'Confirmar Reactivación',
            icon: 'pi pi-question-circle',
            acceptLabel: 'Sí, reactivar',
            rejectLabel: 'Cancelar',
            accept: async () => {
                await this.clientService.reactivateClient(client.id);
            },
        });
    }

    /**
     * Handle table pagination
     */
    onPageChange(event: { first?: number | null; rows?: number | null }): void {
        const first = event.first ?? 0;
        const rows = event.rows ?? 50;
        this.clientService.updatePagination(rows, first);
    }

    /**
     * Refresh the client list
     */
    refresh(): void {
        this.clientService.loadClients();
    }

    /**
     * Reset all filters
     */
    resetFilters(): void {
        this.searchTerm.set('');
        this.selectedClientType.set(null);
        this.showActiveOnly.set(false);
        this.clientService.resetFilters();
    }
}
