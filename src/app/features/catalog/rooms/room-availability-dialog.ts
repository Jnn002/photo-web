/**
 * Room Availability Dialog Component
 *
 * Modal dialog showing room details and upcoming sessions.
 * Prepared for future integration with sessions module.
 */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import type { RoomPublic } from '../models/catalog.models';

/**
 * Mock session interface for future integration
 */
interface UpcomingSession {
  id: number;
  clientName: string;
  date: string;
  time: string;
  duration: string;
  status: 'Solicitado' | 'Confirmado' | 'Completado';
}

@Component({
  selector: 'app-room-availability-dialog',
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-availability-dialog.html',
  styleUrl: './room-availability-dialog.css',
})
export class RoomAvailabilityDialogComponent {
  // Inputs
  readonly visible = input.required<boolean>();
  readonly room = input<RoomPublic | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();

  /**
   * Mock data for upcoming sessions
   * TODO: Replace with real data from sessions service when implemented
   */
  get upcomingSessions(): UpcomingSession[] {
    const room = this.room();
    if (!room) return [];

    // Mock data - to be replaced with real API call
    return [
      {
        id: 1,
        clientName: 'María González',
        date: '19 de diciembre de 2024',
        time: '10:00',
        duration: '2 horas',
        status: 'Solicitado',
      },
    ];
  }

  /**
   * Handle dialog close
   */
  onHide(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Get status severity for session status tag
   */
  getSessionStatusSeverity(
    status: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
    const severityMap: Record<string, 'info' | 'success' | 'secondary'> = {
      Solicitado: 'info',
      Confirmado: 'success',
      Completado: 'secondary',
    };
    return severityMap[status] ?? null;
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: string | number | null | undefined): string {
    if (!value) return 'No especificada';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(numValue);
  }
}
