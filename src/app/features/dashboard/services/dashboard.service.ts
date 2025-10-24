import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import type { DashboardStats, SessionsByStatus } from '@generated/types.gen';

@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/dashboard`;

    private readonly _stats = signal<DashboardStats | null>(null);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly stats = this._stats.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly metrics = computed(() => {
        const stats = this._stats();
        if (!stats) return null;

        return [
            {
                title: 'Sesiones Activas',
                value: stats.active_sessions_count,
                subtitle: 'No completadas o canceladas',
            },
            {
                title: 'Sesiones Este Mes',
                value: stats.sessions_this_month,
                subtitle: 'Creadas en el mes actual',
            },
            {
                title: 'Ingresos del Mes',
                value: `Q ${parseFloat(stats.total_revenue_this_month).toFixed(2)}`,
                subtitle: 'Pagos recibidos',
            },
            {
                title: 'Balance Pendiente',
                value: `Q ${parseFloat(stats.pending_balance).toFixed(2)}`,
                subtitle: 'Por cobrar',
            },
        ];
    });

    readonly sessionsByStatus = computed(() => {
        const stats = this._stats();
        if (!stats) return [];

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

        const statusLabels: Record<string, string> = {
            Canceled: 'Cancelada',
            Request: 'Solicitud',
            'Pre-scheduled': 'Pre-agendada',
            Negotiation: 'Negociación',
            Confirmed: 'Confirmada',
            Assigned: 'Asignada',
            Attended: 'Atendida',
            'In editing': 'En Edición',
            Completed: 'Completada',
        };

        const total = stats.sessions_by_status.reduce((sum, item) => sum + item.count, 0);

        return stats.sessions_by_status.map((item) => ({
            label: statusLabels[item.status] || item.status,
            count: item.count,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
            color: statusColors[item.status] || '#6b7280',
        }));
    });

    getStats(year?: number, month?: number): Observable<DashboardStats> {
        this._loading.set(true);
        this._error.set(null);

        let params = new HttpParams();
        if (year) params = params.set('year', year.toString());
        if (month) params = params.set('month', month.toString());

        return this.http.get<DashboardStats>(`${this.baseUrl}/stats`, { params }).pipe(
            tap({
                next: (stats) => {
                    this._stats.set(stats);
                    this._loading.set(false);
                },
                error: (error) => {
                    this._error.set(error.message || 'Error loading dashboard stats');
                    this._loading.set(false);
                },
            })
        );
    }

    refresh(): void {
        const now = new Date();
        this.getStats(now.getFullYear(), now.getMonth() + 1).subscribe();
    }
}
