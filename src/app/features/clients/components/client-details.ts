/**
 * Client Details Component
 *
 * Displays detailed information about a client.
 * Shows client info, statistics, and recent sessions.
 */

import { Component, ChangeDetectionStrategy, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';

import { ClientService } from '../services/client.service';
import {
    getClientTypeLabel,
    getClientTypeSeverity,
    getStatusLabel,
    getStatusSeverity,
} from '../models/client.models';

@Component({
    selector: 'app-client-details',
    imports: [
        CommonModule,
        CardModule,
        ButtonModule,
        TagModule,
        DividerModule,
        SkeletonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './client-details.html',
    styleUrl: './client-details.css',
})
export class ClientDetailsComponent {
    private readonly clientService = inject(ClientService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly client = this.clientService.currentClient;
    readonly loading = this.clientService.detailsLoading;
    readonly error = this.clientService.detailsError;

    readonly clientId = signal<number | null>(null);

    // Helper functions for template
    readonly getClientTypeLabel = getClientTypeLabel;
    readonly getClientTypeSeverity = getClientTypeSeverity;
    readonly getStatusLabel = getStatusLabel;
    readonly getStatusSeverity = getStatusSeverity;

    constructor() {
        effect(
            () => {
                const params = this.route.snapshot.paramMap;
                const id = params.get('id');

                if (id) {
                    const clientIdNum = parseInt(id, 10);
                    if (!isNaN(clientIdNum)) {
                        this.clientId.set(clientIdNum);
                        this.clientService.loadClient(clientIdNum);
                    }
                }
            },
            { allowSignalWrites: true },
        );
    }

    /**
     * Navigate back to clients list
     */
    goBack(): void {
        this.router.navigate(['/clients']);
    }

    /**
     * Navigate to edit client form
     */
    editClient(): void {
        const id = this.clientId();
        if (id) {
            this.router.navigate(['/clients', id, 'edit']);
        }
    }

    /**
     * Format date to locale string
     */
    formatDate(date: string | Date): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
}
