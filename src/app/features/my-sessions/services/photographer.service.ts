import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { NotificationService } from '@core/services/notification';
import {
    SessionPhotographerListItem,
    SessionPhotographerView,
    PhotographerStats,
    SessionTeamInfo,
    MarkAttendedRequest,
    SessionStatus,
} from '../models/photographer.models';
import { environment } from '@environments/environment.development';

/**
 * Service for photographer-specific operations.
 *
 * Provides photographers with:
 * - View their assigned sessions
 * - Access to session details relevant to their work
 * - Ability to mark sessions as attended
 * - Statistics and metrics
 *
 * All operations are scoped to the current user (photographer).
 */
@Injectable({ providedIn: 'root' })
export class PhotographerService {
    private readonly http = inject(HttpClient);
    private readonly notificationService = inject(NotificationService);

    private readonly API_BASE = `${environment.apiUrl}/photographers`;

    // ==================== State Signals ====================

    private readonly _sessions = signal<SessionPhotographerListItem[]>([]);
    private readonly _loading = signal(false);
    private readonly _stats = signal<PhotographerStats | null>(null);
    private readonly _currentSessionDetail = signal<SessionPhotographerView | null>(null);

    // ==================== Public Read-Only Signals ====================

    /**
     * List of sessions assigned to the current photographer
     */
    readonly sessions = this._sessions.asReadonly();

    /**
     * Loading state for async operations
     */
    readonly loading = this._loading.asReadonly();

    /**
     * Photographer statistics and metrics
     */
    readonly stats = this._stats.asReadonly();

    /**
     * Currently loaded session detail
     */
    readonly currentSessionDetail = this._currentSessionDetail.asReadonly();

    // ==================== Computed Signals ====================

    /**
     * Sessions filtered by status ASSIGNED
     */
    readonly assignedSessions = computed(() =>
        this._sessions().filter((s) => s.status === SessionStatus.ASSIGNED)
    );

    /**
     * Sessions filtered by status ATTENDED
     */
    readonly attendedSessions = computed(() =>
        this._sessions().filter((s) => s.status === SessionStatus.ATTENDED)
    );

    /**
     * Sessions that need attendance marking (ASSIGNED + not attended by me)
     */
    readonly pendingSessions = computed(() =>
        this._sessions().filter((s) => s.status === SessionStatus.ASSIGNED && !s.my_attended)
    );

    /**
     * Count of pending sessions
     */
    readonly pendingCount = computed(() => this.pendingSessions().length);

    // ==================== HTTP Methods ====================

    /**
     * Load list of sessions assigned to the current photographer
     *
     * @param filters - Optional filters (status, start_date, end_date, limit, offset)
     */
    loadMySessions(filters?: {
        status?: SessionStatus;
        start_date?: string;
        end_date?: string;
        limit?: number;
        offset?: number;
    }): void {
        this._loading.set(true);

        let params = new HttpParams();

        if (filters?.status) {
            params = params.set('status', filters.status);
        }
        if (filters?.start_date) {
            params = params.set('start_date', filters.start_date);
        }
        if (filters?.end_date) {
            params = params.set('end_date', filters.end_date);
        }
        if (filters?.limit) {
            params = params.set('limit', filters.limit.toString());
        }
        if (filters?.offset) {
            params = params.set('offset', filters.offset.toString());
        }

        this.http
            .get<SessionPhotographerListItem[]>(`${this.API_BASE}/sessions`, { params })
            .pipe(
                tap({
                    next: (sessions) => {
                        this._sessions.set(sessions);
                        this._loading.set(false);
                    },
                    error: (error) => {
                        console.error('Error loading photographer sessions:', error);
                        this.notificationService.showError(
                            'Error al cargar tus sesiones asignadas'
                        );
                        this._loading.set(false);
                    },
                })
            )
            .subscribe();
    }

    /**
     * Load detailed information about a specific session
     *
     * @param sessionId - ID of the session
     * @returns Observable with session detail
     */
    getSessionDetail(sessionId: number): Observable<SessionPhotographerView> {
        this._loading.set(true);

        return this.http
            .get<SessionPhotographerView>(`${this.API_BASE}/sessions/${sessionId}`)
            .pipe(
                tap({
                    next: (session) => {
                        this._currentSessionDetail.set(session);
                        this._loading.set(false);
                    },
                    error: (error) => {
                        console.error('Error loading session detail:', error);
                        this.notificationService.showError(
                            'Error al cargar los detalles de la sesión'
                        );
                        this._loading.set(false);
                    },
                })
            );
    }

    /**
     * Mark a session as attended (or unattended)
     *
     * @param sessionId - ID of the session
     * @param data - Attendance data (attended flag and optional notes)
     * @returns Observable with updated session detail
     */
    markAttended(
        sessionId: number,
        data: MarkAttendedRequest
    ): Observable<SessionPhotographerView> {
        return this.http
            .patch<SessionPhotographerView>(`${this.API_BASE}/sessions/${sessionId}/attend`, data)
            .pipe(
                tap({
                    next: (updatedSession) => {
                        this._currentSessionDetail.set(updatedSession);

                        // Update session in list if present
                        this._sessions.update((sessions) =>
                            sessions.map((s) =>
                                s.id === sessionId
                                    ? {
                                          ...s,
                                          my_attended: data.attended,
                                          my_attended_at: data.attended
                                              ? new Date().toISOString()
                                              : null,
                                          status: updatedSession.status, // May have transitioned to ATTENDED
                                      }
                                    : s
                            )
                        );

                        this.notificationService.showSuccess(
                            data.attended
                                ? 'Asistencia confirmada exitosamente'
                                : 'Asistencia desmarcada'
                        );
                    },
                    error: (error) => {
                        console.error('Error marking attendance:', error);
                        this.notificationService.showError(
                            'Error al marcar asistencia. Por favor intenta de nuevo.'
                        );
                    },
                })
            );
    }

    /**
     * Get team information for a session (all photographers assigned)
     *
     * @param sessionId - ID of the session
     * @returns Observable with team info
     */
    getSessionTeam(sessionId: number): Observable<SessionTeamInfo> {
        return this.http.get<SessionTeamInfo>(`${this.API_BASE}/sessions/${sessionId}/team`).pipe(
            tap({
                error: (error) => {
                    console.error('Error loading session team:', error);
                    this.notificationService.showError('Error al cargar información del equipo');
                },
            })
        );
    }

    /**
     * Load photographer statistics
     */
    loadStats(): void {
        this.http
            .get<PhotographerStats>(`${this.API_BASE}/stats`)
            .pipe(
                tap({
                    next: (stats) => {
                        this._stats.set(stats);
                    },
                    error: (error) => {
                        console.error('Error loading photographer stats:', error);
                        this.notificationService.showError('Error al cargar estadísticas');
                    },
                })
            )
            .subscribe();
    }

    /**
     * Clear current session detail (useful when navigating away)
     */
    clearCurrentSession(): void {
        this._currentSessionDetail.set(null);
    }

    /**
     * Refresh sessions list (reload with current filters)
     */
    refreshSessions(): void {
        this.loadMySessions();
    }
}
