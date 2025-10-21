import { Component, ChangeDetectionStrategy, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { DashboardService } from './services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CardModule, ChartModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly loading = this.dashboardService.loading;
  readonly error = this.dashboardService.error;
  readonly metrics = this.dashboardService.metrics;
  readonly sessionStatuses = this.dashboardService.sessionsByStatus;

  constructor() {
    effect(() => {
      this.dashboardService.refresh();
    }, { allowSignalWrites: true });
  }

  readonly chartData = computed(() => ({
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Sesiones',
        data: [5, 8, 6, 10, 7, 9, 12, 8, 10, 11, 9, 8],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }));

  readonly chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          stepSize: 2
        }
      }
    }
  }));

  readonly statusChartData = computed(() => {
    const statuses = this.sessionStatuses();
    return {
      labels: statuses.map(s => s.label),
      datasets: [{
        data: statuses.map(s => s.count),
        backgroundColor: statuses.map(s => s.color)
      }]
    };
  });

  readonly statusChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  }));
}
