import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService } from './services/dashboard.service';

interface MonthOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ChartModule,
        TagModule,
        ButtonModule,
        Select,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardComponent {
    private readonly dashboardService = inject(DashboardService);

    readonly loading = this.dashboardService.loading;
    readonly error = this.dashboardService.error;
    readonly metrics = this.dashboardService.metrics;
    readonly sessionStatuses = this.dashboardService.sessionsByStatus;

    // Date filters
    private readonly currentDate = new Date();
    readonly selectedYear = signal(this.currentDate.getFullYear());
    readonly selectedMonth = signal(this.currentDate.getMonth() + 1);

    // Year options (last 3 years + current + next)
    readonly yearOptions = computed(() => {
        const current = this.currentDate.getFullYear();
        return Array.from({ length: 5 }, (_, i) => ({
            label: (current - 3 + i).toString(),
            value: current - 3 + i,
        }));
    });

    // Month options
    readonly monthOptions: MonthOption[] = [
        { label: 'Enero', value: 1 },
        { label: 'Febrero', value: 2 },
        { label: 'Marzo', value: 3 },
        { label: 'Abril', value: 4 },
        { label: 'Mayo', value: 5 },
        { label: 'Junio', value: 6 },
        { label: 'Julio', value: 7 },
        { label: 'Agosto', value: 8 },
        { label: 'Septiembre', value: 9 },
        { label: 'Octubre', value: 10 },
        { label: 'Noviembre', value: 11 },
        { label: 'Diciembre', value: 12 },
    ];

    constructor() {
        // Load initial data for current month/year
        this.loadData();
    }

    /**
     * Load dashboard data for selected month/year
     */
    loadData(): void {
        this.dashboardService.getStats(this.selectedYear(), this.selectedMonth()).subscribe();
    }

    /**
     * Handle year change
     */
    onYearChange(year: number): void {
        this.selectedYear.set(year);
        this.loadData();
    }

    /**
     * Handle month change
     */
    onMonthChange(month: number): void {
        this.selectedMonth.set(month);
        this.loadData();
    }

    /**
     * Refresh current data
     */
    refresh(): void {
        this.loadData();
    }

    // Chart configuration for status distribution
    readonly statusChartData = computed(() => {
        const statuses = this.sessionStatuses();
        return {
            labels: statuses.map((s) => s.label),
            datasets: [
                {
                    data: statuses.map((s) => s.count),
                    backgroundColor: statuses.map((s) => s.color),
                },
            ],
        };
    });

    readonly statusChartOptions = computed(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
    }));
}
