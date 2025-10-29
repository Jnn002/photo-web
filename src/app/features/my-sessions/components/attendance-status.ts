import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { TagModule } from 'primeng/tag';

/**
 * Reusable component to display attendance status as a visual badge
 *
 * Shows different colors and text based on attendance state:
 * - Attended: green badge with "Asistido" + date
 * - Pending: orange/warning badge with "Pendiente"
 */
@Component({
  selector: 'app-attendance-status',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag
      [value]="label()"
      [severity]="severity()"
      [icon]="icon()"
    />
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class AttendanceStatusComponent {
  /**
   * Whether the session/photographer has marked attendance
   */
  readonly attended = input.required<boolean>();

  /**
   * Optional timestamp of when attendance was marked (ISO 8601)
   */
  readonly attendedAt = input<string | null>(null);

  /**
   * Computed label text for the badge
   */
  readonly label = computed(() => {
    if (this.attended()) {
      const dateStr = this.attendedAt();
      if (dateStr) {
        const date = new Date(dateStr);
        const formatted = date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        return `Asistido (${formatted})`;
      }
      return 'Asistido';
    }
    return 'Pendiente';
  });

  /**
   * Computed severity for PrimeNG tag styling
   */
  readonly severity = computed(() => {
    return this.attended() ? 'success' : 'warn';
  });

  /**
   * Computed icon for the badge
   */
  readonly icon = computed(() => {
    return this.attended() ? 'pi pi-check-circle' : 'pi pi-clock';
  });
}
