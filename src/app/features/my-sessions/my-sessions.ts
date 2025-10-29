import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PhotographerService } from './services/photographer.service';
import { AttendanceStatusComponent } from './components/attendance-status';
import { MarkAttendanceDialogComponent } from './components/mark-attendance-dialog';
import {
  SessionPhotographerListItem,
  SessionStatus,
  SessionType,
  PhotographerRole,
  MarkAttendedRequest,
} from './models/photographer.models';

/**
 * Component for listing photographer's assigned sessions
 *
 * Shows all sessions assigned to the current photographer with:
 * - Filtering by status and date range
 * - Quick attendance marking
 * - Navigation to session details
 */
@Component({
  selector: 'app-my-sessions',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    CardModule,
    ProgressSpinnerModule,
    AttendanceStatusComponent,
    MarkAttendanceDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-sessions.html',
  styleUrl: './my-sessions.css',
})
export class MySessionsComponent implements OnInit {
  private readonly photographerService = inject(PhotographerService);
  private readonly router = inject(Router);

  // ==================== State ====================

  /**
   * Filter: selected session status
   */
  readonly selectedStatus = signal<SessionStatus | null>(null);

  /**
   * Filter: date range
   */
  readonly dateRange = signal<Date[] | null>(null);

  /**
   * Dialog visibility
   */
  readonly showAttendanceDialog = signal(false);

  /**
   * Session selected for attendance marking
   */
  readonly selectedSession = signal<SessionPhotographerListItem | null>(null);

  /**
   * Whether to mark as attended (true) or unmark (false)
   */
  readonly markAsAttended = signal(true);

  // ==================== Service Signals ====================

  readonly sessions = this.photographerService.sessions;
  readonly loading = this.photographerService.loading;
  readonly pendingCount = this.photographerService.pendingCount;

  // ==================== Filter Options ====================

  readonly statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Asignada', value: SessionStatus.ASSIGNED },
    { label: 'Atendida', value: SessionStatus.ATTENDED },
    { label: 'En Edición', value: SessionStatus.IN_EDITING },
    { label: 'Lista para Entrega', value: SessionStatus.READY_FOR_DELIVERY },
    { label: 'Completada', value: SessionStatus.COMPLETED },
    { label: 'Cancelada', value: SessionStatus.CANCELED },
  ];

  // ==================== Computed Values ====================

  /**
   * Formatted date range for display
   */
  readonly dateRangeFormatted = computed(() => {
    const range = this.dateRange();
    if (!range || range.length === 0) return null;

    const start = range[0]?.toLocaleDateString('es-ES');
    const end = range[1]?.toLocaleDateString('es-ES');

    return end ? `${start} - ${end}` : start;
  });

  // ==================== Lifecycle ====================

  ngOnInit(): void {
    this.loadSessions();
  }

  // ==================== Actions ====================

  /**
   * Load sessions with current filters
   */
  loadSessions(): void {
    const filters: Parameters<typeof this.photographerService.loadMySessions>[0] = {};

    if (this.selectedStatus()) {
      filters.status = this.selectedStatus()!;
    }

    const range = this.dateRange();
    if (range && range.length > 0) {
      if (range[0]) {
        filters.start_date = range[0].toISOString().split('T')[0];
      }
      if (range[1]) {
        filters.end_date = range[1].toISOString().split('T')[0];
      }
    }

    this.photographerService.loadMySessions(filters);
  }

  /**
   * Handle filter changes
   */
  onFilterChange(): void {
    this.loadSessions();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedStatus.set(null);
    this.dateRange.set(null);
    this.loadSessions();
  }

  /**
   * Navigate to session details
   */
  viewDetails(session: SessionPhotographerListItem): void {
    this.router.navigate(['/my-sessions', session.id]);
  }

  /**
   * Open attendance marking dialog
   */
  openAttendanceDialog(session: SessionPhotographerListItem, markAsAttended: boolean): void {
    this.selectedSession.set(session);
    this.markAsAttended.set(markAsAttended);
    this.showAttendanceDialog.set(true);
  }

  /**
   * Handle attendance confirmation
   */
  onAttendanceConfirm(request: MarkAttendedRequest): void {
    const session = this.selectedSession();
    if (!session) return;

    this.photographerService.markAttended(session.id, request).subscribe({
      next: () => {
        // Reload sessions to reflect changes
        this.loadSessions();
      },
    });
  }

  /**
   * Check if session can have attendance marked
   */
  canMarkAttendance(session: SessionPhotographerListItem): boolean {
    return session.status === SessionStatus.ASSIGNED;
  }

  // ==================== Display Helpers ====================

  /**
   * Get severity for session status badge
   */
  getStatusSeverity(status: SessionStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case SessionStatus.COMPLETED:
        return 'success';
      case SessionStatus.ASSIGNED:
      case SessionStatus.ATTENDED:
        return 'info';
      case SessionStatus.IN_EDITING:
      case SessionStatus.READY_FOR_DELIVERY:
        return 'secondary';
      case SessionStatus.CANCELED:
        return 'danger';
      default:
        return 'warn';
    }
  }

  /**
   * Get display text for session status
   */
  getStatusLabel(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.REQUEST:
        return 'Solicitada';
      case SessionStatus.NEGOTIATION:
        return 'Negociación';
      case SessionStatus.PRE_SCHEDULED:
        return 'Pre-agendada';
      case SessionStatus.CONFIRMED:
        return 'Confirmada';
      case SessionStatus.ASSIGNED:
        return 'Asignada';
      case SessionStatus.ATTENDED:
        return 'Atendida';
      case SessionStatus.IN_EDITING:
        return 'En Edición';
      case SessionStatus.READY_FOR_DELIVERY:
        return 'Lista para Entrega';
      case SessionStatus.COMPLETED:
        return 'Completada';
      case SessionStatus.CANCELED:
        return 'Cancelada';
      default:
        return status;
    }
  }

  /**
   * Get display text for session type
   */
  getTypeLabel(type: SessionType): string {
    return type === SessionType.STUDIO ? 'Estudio' : 'Externa';
  }

  /**
   * Get display text for photographer role
   */
  getRoleLabel(role: PhotographerRole | null): string {
    if (!role) return '-';
    switch (role) {
      case PhotographerRole.LEAD:
        return 'Principal';
      case PhotographerRole.ASSISTANT:
        return 'Asistente';
      case PhotographerRole.SPECIALIST:
        return 'Especialista';
      default:
        return role;
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Format time for display
   */
  formatTime(timeString: string | null): string {
    return timeString || '-';
  }
}
