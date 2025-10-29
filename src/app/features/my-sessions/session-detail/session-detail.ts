import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';

import { PhotographerService } from '../services/photographer.service';
import { AttendanceStatusComponent } from '../components/attendance-status';
import { MarkAttendanceDialogComponent } from '../components/mark-attendance-dialog';
import {
  SessionPhotographerView,
  SessionTeamInfo,
  SessionStatus,
  SessionType,
  PhotographerRole,
  PhotographerAssignmentInfo,
  MarkAttendedRequest,
} from '../models/photographer.models';

/**
 * Component for displaying detailed session information to photographers
 *
 * Shows:
 * - Session info (date, time, location, duration)
 * - Client basic info (name, email, phone)
 * - Items/packages without prices
 * - Client requirements
 * - Photographer team with attendance status
 * - Action button to mark attendance
 */
@Component({
  selector: 'app-session-detail',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    PanelModule,
    TableModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    AttendanceStatusComponent,
    MarkAttendanceDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.css',
})
export class SessionDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly photographerService = inject(PhotographerService);

  // ==================== State ====================

  /**
   * Session detail data
   */
  readonly session = signal<SessionPhotographerView | null>(null);

  /**
   * Team information
   */
  readonly team = signal<SessionTeamInfo | null>(null);

  /**
   * Dialog visibility
   */
  readonly showAttendanceDialog = signal(false);

  /**
   * Whether to mark as attended (true) or unmark (false)
   */
  readonly markAsAttended = signal(true);

  // ==================== Route Params ====================

  private readonly routeParams = toSignal(this.route.paramMap);
  readonly sessionId = computed(() => {
    const id = this.routeParams()?.get('id');
    return id ? parseInt(id, 10) : null;
  });

  // ==================== Service Signals ====================

  readonly loading = this.photographerService.loading;

  // ==================== Computed Values ====================

  /**
   * Can mark attendance (session is ASSIGNED and not attended yet)
   */
  readonly canMarkAttendance = computed(() => {
    const s = this.session();
    return s?.status === SessionStatus.ASSIGNED && !s.my_attended;
  });

  /**
   * Can unmark attendance (already marked attended)
   */
  readonly canUnmarkAttendance = computed(() => {
    const s = this.session();
    return s?.my_attended === true;
  });

  /**
   * Team attendance progress (how many have marked attended)
   */
  readonly attendanceProgress = computed(() => {
    const t = this.team();
    if (!t || t.photographers.length === 0) {
      return { attended: 0, total: 0, percentage: 0 };
    }

    const attended = t.photographers.filter((p) => p.attended).length;
    const total = t.photographers.length;
    const percentage = Math.round((attended / total) * 100);

    return { attended, total, percentage };
  });

  /**
   * Progress bar severity based on percentage
   */
  readonly progressSeverity = computed(() => {
    const progress = this.attendanceProgress();
    if (progress.percentage === 100) return 'success';
    if (progress.percentage >= 50) return 'info';
    return 'warning';
  });

  // ==================== Lifecycle ====================

  ngOnInit(): void {
    const id = this.sessionId();
    if (id) {
      this.loadSessionDetail(id);
      this.loadTeamInfo(id);
    } else {
      this.router.navigate(['/my-sessions']);
    }
  }

  ngOnDestroy(): void {
    this.photographerService.clearCurrentSession();
  }

  // ==================== Actions ====================

  /**
   * Load session detail
   */
  private loadSessionDetail(sessionId: number): void {
    this.photographerService.getSessionDetail(sessionId).subscribe({
      next: (session) => {
        this.session.set(session);
      },
      error: () => {
        // Error handled by service, navigate back
        this.router.navigate(['/my-sessions']);
      },
    });
  }

  /**
   * Load team information
   */
  private loadTeamInfo(sessionId: number): void {
    this.photographerService.getSessionTeam(sessionId).subscribe({
      next: (team) => {
        this.team.set(team);
      },
    });
  }

  /**
   * Open attendance marking dialog
   */
  openAttendanceDialog(markAsAttended: boolean): void {
    this.markAsAttended.set(markAsAttended);
    this.showAttendanceDialog.set(true);
  }

  /**
   * Handle attendance confirmation
   */
  onAttendanceConfirm(request: MarkAttendedRequest): void {
    const id = this.sessionId();
    if (!id) return;

    this.photographerService.markAttended(id, request).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        // Reload team to see updated attendance
        this.loadTeamInfo(id);
      },
    });
  }

  /**
   * Navigate back to list
   */
  goBack(): void {
    this.router.navigate(['/my-sessions']);
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
   * Get severity for role badge
   */
  getRoleSeverity(role: PhotographerRole | null): 'info' | 'secondary' {
    return role === PhotographerRole.LEAD ? 'info' : 'secondary';
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Format time for display
   */
  formatTime(timeString: string | null): string {
    return timeString || 'No especificada';
  }

  /**
   * Format duration for display
   */
  formatDuration(hours: number | null): string {
    if (!hours) return 'No especificada';
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
}
