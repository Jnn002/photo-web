import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SessionService } from '../services/session.service';
import { ClientService } from '../../clients/services/client.service';
import { UserService } from '../../users/services/user.service';
import { NotificationService } from '../../../core/services/notification';
import {
    SessionDetail,
    SessionStatus,
    STATUS_BADGE_MAP,
    SESSION_TYPE_LABELS,
    SessionStatusHistory,
    SessionDetailLineItem,
    SessionPayment,
    SessionPhotographer,
    VALID_TRANSITIONS,
} from '../models/session.models';
import type { ClientPublic } from '../../clients/models/client.models';
import { AssignPhotographerDialogComponent } from './dialogs/assign-photographer-dialog';
import { AssignEditorDialogComponent } from './dialogs/assign-editor-dialog';
import { RecordPaymentDialogComponent } from './dialogs/record-payment-dialog';
import { ChangeStatusDialogComponent } from './dialogs/change-status-dialog';
import { AddItemToSessionDialogComponent } from './dialogs/add-item-to-session-dialog';
import { AddPackageToSessionDialogComponent } from './dialogs/add-package-to-session-dialog';

@Component({
    selector: 'app-session-details',
    imports: [
        CommonModule,
        ButtonModule,
        TagModule,
        TimelineModule,
        PanelModule,
        ProgressBarModule,
    ],
    providers: [DialogService],
    templateUrl: './session-details.html',
    styleUrl: './session-details.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionDetailsComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sessionService = inject(SessionService);
    private readonly clientService = inject(ClientService);
    private readonly userService = inject(UserService);
    private readonly notificationService = inject(NotificationService);
    private readonly dialogService = inject(DialogService);

    readonly session = signal<SessionDetail | null>(null);
    readonly sessionDetails = signal<SessionDetailLineItem[]>([]);
    readonly payments = signal<SessionPayment[]>([]);
    readonly photographers = signal<SessionPhotographer[]>([]);
    readonly statusHistory = signal<SessionStatusHistory[]>([]);
    readonly loading = signal(true);

    // Current client information
    readonly currentClient = signal<ClientPublic | null>(null);

    // Session ID from route
    private readonly sessionId = signal<number | null>(null);

    dialogRef: DynamicDialogRef | null = null;

    constructor() {
        // Get session ID from route and load data
        const id = this.route.snapshot.params['id'];
        if (id) {
            this.sessionId.set(parseInt(id, 10));
        }
    }

    // Load session data effect - runs automatically when sessionId changes
    private loadDataEffect = effect(() => {
        const id = this.sessionId();
        if (id) {
            this.loadSessionData(id);
        }
    });

    loadSessionData(sessionId: number) {
        this.loading.set(true);

        // Load session details
        this.sessionService.getSession(sessionId).subscribe({
            next: (session) => {
                this.session.set(session);
                this.loading.set(false);

                // Load client information
                this.loadClientInfo(session.client_id);
            },
            error: (error) => {
                console.error('Error loading session:', error);
                this.notificationService.showError('Error al cargar la sesión');
                this.loading.set(false);
            },
        });

        // Load session line items
        this.sessionService.listSessionDetails(sessionId).subscribe({
            next: (details) => {
                this.sessionDetails.set(details);
            },
            error: (error) => {
                console.error('Error loading session details:', error);
            },
        });

        // Load payments
        this.sessionService.listSessionPayments(sessionId).subscribe({
            next: (payments) => {
                this.payments.set(payments);
            },
            error: (error) => {
                console.error('Error loading payments:', error);
            },
        });

        // Load photographers
        this.sessionService.listSessionPhotographers(sessionId).subscribe({
            next: (photographers) => {
                this.photographers.set(photographers);
            },
            error: (error) => {
                console.error('Error loading photographers:', error);
            },
        });

        // Load status history
        this.sessionService.getSessionStatusHistory(sessionId).subscribe({
            next: (history) => {
                this.statusHistory.set(history.reverse()); // Most recent first
            },
            error: (error) => {
                console.error('Error loading status history:', error);
            },
        });
    }

    openAssignPhotographerDialog() {
        this.dialogRef = this.dialogService.open(AssignPhotographerDialogComponent, {
            header: 'Asignar Fotógrafo',
            width: '500px',
            data: { sessionId: this.session()!.id },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openAssignEditorDialog() {
        this.dialogRef = this.dialogService.open(AssignEditorDialogComponent, {
            header: 'Asignar Editor',
            width: '500px',
            data: { sessionId: this.session()!.id },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openRecordPaymentDialog() {
        this.dialogRef = this.dialogService.open(RecordPaymentDialogComponent, {
            header: 'Registrar Pago',
            width: '600px',
            data: {
                sessionId: this.session()!.id,
                remainingBalance: this.session()!.balance_amount,
            },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openChangeStatusDialog() {
        const validTransitions = VALID_TRANSITIONS[this.session()!.status];

        this.dialogRef = this.dialogService.open(ChangeStatusDialogComponent, {
            header: 'Cambiar Estado',
            width: '500px',
            data: {
                sessionId: this.session()!.id,
                currentStatus: this.session()!.status,
                validTransitions,
            },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openAddItemDialog() {
        this.dialogRef = this.dialogService.open(AddItemToSessionDialogComponent, {
            header: 'Agregar Item a la Sesión',
            width: '600px',
            data: { sessionId: this.session()!.id },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openAddPackageDialog() {
        this.dialogRef = this.dialogService.open(AddPackageToSessionDialogComponent, {
            header: 'Agregar Package a la Sesión',
            width: '700px',
            data: { sessionId: this.session()!.id },
        });

        this.dialogRef?.onClose.subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    removeSessionDetail(detailId: number) {
        if (confirm('¿Está seguro que desea eliminar este item de la sesión?')) {
            this.sessionService.removeSessionDetail(this.session()!.id, detailId).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Item eliminado exitosamente');
                    this.loadSessionData(this.session()!.id);
                },
                error: (error) => {
                    console.error('Error removing session detail:', error);
                    this.notificationService.showError('Error al eliminar el item');
                },
            });
        }
    }

    loadClientInfo(clientId: number) {
        this.clientService.loadClient(clientId).then(() => {
            this.currentClient.set(this.clientService.currentClient());
        });
    }

    editSession() {
        this.router.navigate(['/sessions', this.session()!.id, 'edit']);
    }

    getStatusBadge(status: SessionStatus) {
        return STATUS_BADGE_MAP[status];
    }

    getSessionTypeLabel(type: string): string {
        return SESSION_TYPE_LABELS[type as keyof typeof SESSION_TYPE_LABELS];
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    formatDateTime(dateTimeString: string): string {
        const date = new Date(dateTimeString);
        return date.toLocaleString('es-GT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatCurrency(amount: number): string {
        return amount.toFixed(2);
    }

    getClientName(clientId: number): string {
        // TODO: Implement client name lookup
        return `Cliente #${clientId}`;
    }

    getPaymentProgress(): number {
        if (this.session()!.total_amount === 0) return 0;
        return Math.round((this.session()!.paid_amount / this.session()!.total_amount) * 100);
    }

    getStatusColor(status: string): string {
        const statusEnum = status as SessionStatus;
        const badge = STATUS_BADGE_MAP[statusEnum];
        const colorMap = {
            success: '#22c55e',
            info: '#3b82f6',
            warn: '#f59e0b',
            danger: '#ef4444',
            secondary: '#6b7280',
        };
        return colorMap[badge.severity];
    }

    canEditSession(): boolean {
        if (!this.session()) return false;
        const session = this.session()!;

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

    canChangeStatus(): boolean {
        if (!this.session()) return false;
        const validTransitions = VALID_TRANSITIONS[this.session()!.status];
        return validTransitions.length > 0;
    }
}
