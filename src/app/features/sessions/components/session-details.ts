import {
    Component,
    inject,
    signal,
    computed,
    effect,
    untracked,
    ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
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
    PAYMENT_TYPE_LABELS,
    PaymentType,
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
        CardModule,
        ProgressBarModule,
        ProgressSpinnerModule,
        TooltipModule,
    ],
    providers: [DialogService],
    templateUrl: './session-details.html',
    styleUrl: './session-details.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionDetailsComponent {
    private readonly route = inject(ActivatedRoute);
    readonly router = inject(Router);
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
    private readonly isRefreshing = signal(false);

    // Current client information
    readonly currentClient = signal<ClientPublic | null>(null);

    // Reactive route params (Angular 20+ pattern)
    private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });
    readonly sessionId = computed(() => {
        const idStr = this.paramMap().get('id');
        return idStr ? parseInt(idStr, 10) : null;
    });

    dialogRef: DynamicDialogRef | null = null;

    // ==================== Validation Methods ====================

    /**
     * Verifica si se pueden asignar fotógrafos
     * Solo permitido en estados Confirmed y Assigned
     */
    readonly canAssignPhotographer = computed(() => {
        const session = this.session();
        if (!session) return false;

        const allowedStatuses = [SessionStatus.CONFIRMED, SessionStatus.ASSIGNED];

        return allowedStatuses.includes(session.status);
    });

    /**
     * Verifica si se pueden asignar editores
     * Solo permitido desde estado Attended en adelante y si no hay editor asignado
     */
    readonly canAssignEditor = computed(() => {
        const session = this.session();
        if (!session) return false;

        // No se puede si ya hay editor asignado
        if (session.editing_assigned_to) return false;

        const allowedStatuses = [
            SessionStatus.ATTENDED,
            SessionStatus.IN_EDITING,
            SessionStatus.READY_FOR_DELIVERY,
        ];

        return allowedStatuses.includes(session.status);
    });

    /**
     * Verifica si se pueden registrar pagos
     * Solo permitido si hay items/paquetes y no está Canceled/Completed
     */
    readonly canRecordPayment = computed(() => {
        const session = this.session();
        if (!session) return false;

        // No se pueden registrar pagos en sesiones canceladas o completadas
        if (
            session.status === SessionStatus.CANCELED ||
            session.status === SessionStatus.COMPLETED
        ) {
            return false;
        }

        // Solo se pueden registrar pagos si hay items/paquetes
        return session.total_amount > 0 && this.sessionDetails().length > 0;
    });

    /**
     * Verifica si se pueden agregar/eliminar items/paquetes
     * Solo permitido antes del estado Confirmed
     */
    readonly canModifyItems = computed(() => {
        const session = this.session();
        if (!session) return false;

        const allowedStatuses = [
            SessionStatus.REQUEST,
            SessionStatus.NEGOTIATION,
            SessionStatus.PRE_SCHEDULED,
        ];

        return allowedStatuses.includes(session.status);
    });

    /**
     * Obtiene las razones por las que los botones están deshabilitados
     * Útil para mostrar tooltips informativos
     */
    readonly getDisabledReason = computed(() => {
        const session = this.session();
        if (!session)
            return {
                photographer: '',
                editor: '',
                payment: '',
                items: '',
            };

        return {
            photographer: this.canAssignPhotographer()
                ? ''
                : 'Solo se pueden asignar fotógrafos en estados Confirmado y Asignado',
            editor: this.canAssignEditor()
                ? ''
                : session.editing_assigned_to
                ? 'Ya hay un editor asignado'
                : 'Solo se pueden asignar editores desde el estado Atendida',
            payment: this.canRecordPayment()
                ? ''
                : this.sessionDetails().length === 0
                ? 'Debe agregar items o paquetes antes de registrar pagos'
                : 'No se pueden registrar pagos en sesiones canceladas o completadas',
            items: this.canModifyItems()
                ? ''
                : 'No se pueden modificar items después del estado Confirmado',
        };
    });

    constructor() {
        // Load photographers and editors for name lookups
        this.userService.loadUsersWithRoles();

        // Reactive data loading with effect (Angular 20+ zoneless pattern)
        // Use untracked() to prevent infinite loops from signal updates inside loadSessionData
        effect(() => {
            const id = this.sessionId();
            if (id) {
                untracked(() => this.loadSessionData(id));
            }
        });
    }

    loadSessionData(sessionId: number) {
        // Prevent multiple simultaneous loads
        if (this.isRefreshing()) {
            console.warn('Already refreshing session data, skipping duplicate call');
            return;
        }

        this.isRefreshing.set(true);
        this.loading.set(true);

        // Optimize: Load all data in parallel using forkJoin
        // Use catchError to handle individual failures gracefully
        forkJoin({
            session: this.sessionService.getSession(sessionId),
            details: this.sessionService.listSessionDetails(sessionId).pipe(
                catchError((error) => {
                    console.error('Error loading session details:', error);
                    return of([]);
                })
            ),
            payments: this.sessionService.listSessionPayments(sessionId).pipe(
                catchError((error) => {
                    // Handle 403 gracefully - user might not have permission
                    if (error.status === 403) {
                        console.warn('No permission to view payments');
                    } else {
                        console.error('Error loading payments:', error);
                    }
                    return of([]);
                })
            ),
            photographers: this.sessionService.listSessionPhotographers(sessionId).pipe(
                catchError((error) => {
                    console.error('Error loading photographers:', error);
                    return of([]);
                })
            ),
            history: this.sessionService.getSessionStatusHistory(sessionId).pipe(
                catchError((error) => {
                    console.error('Error loading status history:', error);
                    return of([]);
                })
            ),
        }).subscribe({
            next: ({ session, details, payments, photographers, history }) => {
                this.session.set(session);
                this.sessionDetails.set(details);
                this.payments.set(payments);
                this.photographers.set(photographers);
                this.statusHistory.set(history.reverse()); // Most recent first
                this.loading.set(false);
                this.isRefreshing.set(false);

                // Load client information after session is loaded
                this.loadClientInfo(session.client_id);
            },
            error: (error) => {
                console.error('Error loading session:', error);
                this.notificationService.showError('Error al cargar la sesión');
                this.loading.set(false);
                this.isRefreshing.set(false);
            },
        });
    }

    openAssignPhotographerDialog() {
        this.dialogRef = this.dialogService.open(AssignPhotographerDialogComponent, {
            header: 'Asignar Fotógrafo',
            width: '500px',
            data: { sessionId: this.session()!.id },
        });

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
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

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
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

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
            if (result) {
                // Optimized: Only reload payments and session summary instead of everything
                this.refreshPaymentsAndBalance(this.session()!.id);
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
                sessionData: this.session(), // Pass complete session data for validations
            },
        });

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
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

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
            if (result) {
                this.loadSessionData(this.session()!.id);
            }
        });
    }

    openAddPackageDialog() {
        this.dialogRef = this.dialogService.open(AddPackageToSessionDialogComponent, {
            header: 'Agregar Package a la Sesión',
            width: '700px',
            data: {
                sessionId: this.session()!.id,
                sessionType: this.session()!.session_type,
            },
        });

        this.dialogRef?.onClose.pipe(take(1)).subscribe((result) => {
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

    async loadClientInfo(clientId: number): Promise<void> {
        try {
            await this.clientService.loadClient(clientId);
            // ClientService updates its internal signal, we read from it
            const client = this.clientService.currentClient();
            this.currentClient.set(client);
        } catch (error) {
            console.error('Error loading client info:', error);
            this.currentClient.set(null);
        }
    }

    /**
     * Refresh only payments and session balance after recording a payment
     * More efficient than reloading all session data
     */
    refreshPaymentsAndBalance(sessionId: number) {
        console.log('[DEBUG] Refreshing payments and balance for session:', sessionId);
        forkJoin({
            session: this.sessionService.getSession(sessionId),
            payments: this.sessionService.listSessionPayments(sessionId).pipe(
                catchError((error) => {
                    console.error('Error loading payments:', error);
                    return of([]);
                })
            ),
        }).subscribe({
            next: ({ session, payments }) => {
                console.log('[DEBUG] Received payments:', payments.length, 'payments');
                console.log(
                    '[DEBUG] Payment IDs:',
                    payments.map((p) => p.id)
                );
                // Update session to refresh balance amounts
                this.session.set(session);
                // Update payments list
                this.payments.set(payments);
            },
            error: (error) => {
                console.error('Error refreshing payments:', error);
                this.notificationService.showError('Error al actualizar los pagos');
            },
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

    formatCurrency(amount: number | string): string {
        // Handle both string and number from backend
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return isNaN(numAmount) ? '0.00' : numAmount.toFixed(2);
    }

    getClientName(clientId: number): string {
        // TODO: Implement client name lookup
        return `Cliente #${clientId}`;
    }

    getPhotographerName(photographerId: number): string {
        const photographer = this.userService.photographers().find((p) => p.id === photographerId);
        return photographer?.full_name || `Fotógrafo #${photographerId}`;
    }

    getEditorName(editorId: number): string {
        const editor = this.userService.editors().find((e) => e.id === editorId);
        return editor?.full_name || `Editor #${editorId}`;
    }

    getPaymentProgress(): number {
        if (this.session()!.total_amount === 0) return 0;
        return Math.round((this.session()!.paid_amount / this.session()!.total_amount) * 100);
    }

    getStatusColor(status: string): string {
        const statusColors: Record<string, string> = {
            Canceled: '#ef4444',
            Request: '#3b82f6',
            'Pre-scheduled': '#f59e0b',
            Negotiation: '#eab308',
            Confirmed: '#10b981',
            Assigned: '#3b82f6',
            Attended: '#6366f1',
            'In editing': '#8b5cf6',
            Completed: '#6b7280',
        };
        return statusColors[status] || '#6b7280';
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

    getPaymentTypeLabel(type: string): string {
        return PAYMENT_TYPE_LABELS[type as PaymentType] || type;
    }
}
