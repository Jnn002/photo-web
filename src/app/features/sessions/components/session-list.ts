import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { SessionService } from '../services/session.service';
import { ClientService } from '../../clients/services/client.service';
import {
    SessionPublic,
    SessionStatus,
    SessionType,
    STATUS_BADGE_MAP,
    SESSION_TYPE_LABELS,
    SessionListFilters,
} from '../models/session.models';

interface StatusOption {
    label: string;
    value: SessionStatus | null;
}

interface TypeOption {
    label: string;
    value: SessionType | null;
}

@Component({
    selector: 'app-session-list',
    imports: [CommonModule, FormsModule, TableModule, Button, InputText, Select, Tag, Tooltip],
    templateUrl: './session-list.html',
    styleUrl: './session-list.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionListComponent {
    private readonly sessionService = inject(SessionService);
    private readonly clientService = inject(ClientService);
    private readonly router = inject(Router);

    readonly sessions = signal<SessionPublic[]>([]);
    readonly loading = signal(false);
    readonly totalRecords = signal(0);

    // Create a map of client_id to client name for fast lookup
    private readonly clientsMap = computed(() => {
        const map = new Map<number, string>();
        this.clientService.items().forEach((client) => {
            map.set(client.id, client.full_name);
        });
        return map;
    });

    searchTerm = '';
    selectedStatus: SessionStatus | null = null;
    selectedType: SessionType | null = null;
    pageSize = 25;
    currentOffset = 0;

    statusOptions: StatusOption[] = [
        { label: 'Todos', value: null },
        { label: 'Solicitud', value: SessionStatus.REQUEST },
        { label: 'Negociación', value: SessionStatus.NEGOTIATION },
        { label: 'Pre-agendada', value: SessionStatus.PRE_SCHEDULED },
        { label: 'Confirmada', value: SessionStatus.CONFIRMED },
        { label: 'Asignada', value: SessionStatus.ASSIGNED },
        { label: 'Atendida', value: SessionStatus.ATTENDED },
        { label: 'En Edición', value: SessionStatus.IN_EDITING },
        { label: 'Lista para Entrega', value: SessionStatus.READY_FOR_DELIVERY },
        { label: 'Completada', value: SessionStatus.COMPLETED },
        { label: 'Cancelada', value: SessionStatus.CANCELED },
    ];

    typeOptions: TypeOption[] = [
        { label: 'Todos', value: null },
        { label: 'Estudio', value: SessionType.STUDIO },
        { label: 'Externa', value: SessionType.EXTERNAL },
    ];

    constructor() {
        // Load clients for display
        this.clientService.loadClients();

        // Load initial sessions
        this.loadInitialSessions();
    }

    loadInitialSessions() {
        this.loading.set(true);
        const filters: SessionListFilters = {
            limit: this.pageSize,
            offset: 0,
        };

        this.sessionService.listSessions(filters).subscribe({
            next: (response) => {
                this.sessions.set(response.items);
                this.totalRecords.set(response.total);
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error loading sessions:', error);
                this.loading.set(false);
            },
        });
    }

    loadSessions(event: any) {
        this.loading.set(true);
        const offset = event.first || 0;
        const limit = event.rows || this.pageSize;

        const filters: SessionListFilters = {
            status: this.selectedStatus || undefined,
            limit,
            offset,
        };

        this.sessionService.listSessions(filters).subscribe({
            next: (response) => {
                this.sessions.set(response.items);
                this.totalRecords.set(response.total);
                this.currentOffset = offset;
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error loading sessions:', error);
                this.loading.set(false);
            },
        });
    }

    onSearchChange() {
        // Implement search functionality when backend supports it
        // For now, we'll reload with filters
        this.onFilterChange();
    }

    onFilterChange() {
        this.currentOffset = 0;
        this.loadSessions({ first: 0, rows: this.pageSize });
    }

    navigateToCreate() {
        this.router.navigate(['/sessions/create']);
    }

    navigateToDetails(sessionId: number) {
        this.router.navigate(['/sessions', sessionId]);
    }

    navigateToEdit(sessionId: number) {
        this.router.navigate(['/sessions', sessionId, 'edit']);
    }

    getStatusBadge(status: SessionStatus) {
        return STATUS_BADGE_MAP[status];
    }

    getSessionTypeLabel(type: SessionType): string {
        return SESSION_TYPE_LABELS[type];
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    formatCurrency(amount: number): string {
        return amount.toString();
    }

    getClientName(clientId: number): string {
        return this.clientsMap().get(clientId) || `Cliente #${clientId}`;
    }

    canEditSession(session: SessionPublic): boolean {
        // Cannot edit completed or canceled sessions
        if (
            session.status === SessionStatus.COMPLETED ||
            session.status === SessionStatus.CANCELED
        ) {
            return false;
        }

        // Cannot edit if past changes deadline
        if (session.changes_deadline) {
            const deadline = new Date(session.changes_deadline);
            const today = new Date();
            if (today > deadline) {
                return false;
            }
        }

        return true;
    }
}
