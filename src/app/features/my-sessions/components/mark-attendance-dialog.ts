import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  model,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

import { MarkAttendedRequest } from '../models/photographer.models';

/**
 * Dialog component for confirming attendance marking
 *
 * Allows photographer to mark attendance and optionally add notes
 * about the session.
 */
@Component({
  selector: 'app-mark-attendance-dialog',
  imports: [DialogModule, ButtonModule, TextareaModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [header]="dialogTitle()"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '500px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="dialog-content">
        <p class="dialog-message">
          {{ dialogMessage() }}
        </p>

        <div class="field">
          <label for="notes">Notas (opcional)</label>
          <p-textarea
            id="notes"
            [(ngModel)]="notes"
            [maxlength]="1000"
            placeholder="Agrega observaciones o comentarios sobre la sesión..."
            [style]="{ width: '100%', height: '120px' }"
          />
          <small class="char-counter">{{ notes().length }} / 1000 caracteres</small>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          (onClick)="onCancel()"
          [text]="true"
        />
        <p-button
          [label]="confirmButtonLabel()"
          [severity]="confirmButtonSeverity()"
          (onClick)="onConfirm()"
          [icon]="confirmButtonIcon()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .dialog-message {
      margin: 0;
      font-size: 1rem;
      line-height: 1.5;
      color: var(--text-color);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .char-counter {
      text-align: right;
      color: var(--text-color-secondary);
      font-size: 0.75rem;
    }
  `,
})
export class MarkAttendanceDialogComponent {
  /**
   * Whether to mark as attended (true) or unmark (false)
   */
  readonly markAsAttended = input.required<boolean>();

  /**
   * Two-way binding for dialog visibility
   */
  visible = model.required<boolean>();

  /**
   * Event emitted when user confirms the action
   */
  readonly confirm = output<MarkAttendedRequest>();

  /**
   * Event emitted when user cancels the action
   */
  readonly cancel = output<void>();

  /**
   * Notes input value
   */
  readonly notes = signal('');

  /**
   * Dialog title based on action
   */
  readonly dialogTitle = computed(() => {
    return this.markAsAttended()
      ? 'Confirmar Asistencia'
      : 'Desmarcar Asistencia';
  });

  /**
   * Dialog message based on action
   */
  readonly dialogMessage = computed(() => {
    return this.markAsAttended()
      ? '¿Confirmas que asististe a esta sesión fotográfica? Esta acción actualizará el estado de la sesión.'
      : '¿Estás seguro que deseas desmarcar tu asistencia? Esto revertirá el estado de la sesión.';
  });

  /**
   * Confirm button label
   */
  readonly confirmButtonLabel = computed(() => {
    return this.markAsAttended() ? 'Confirmar Asistencia' : 'Desmarcar';
  });

  /**
   * Confirm button severity
   */
  readonly confirmButtonSeverity = computed(() => {
    return this.markAsAttended() ? 'success' : 'warn';
  });

  /**
   * Confirm button icon
   */
  readonly confirmButtonIcon = computed(() => {
    return this.markAsAttended() ? 'pi pi-check' : 'pi pi-times';
  });

  /**
   * Handle confirm action
   */
  onConfirm(): void {
    const request: MarkAttendedRequest = {
      attended: this.markAsAttended(),
      notes: this.notes().trim() || null,
    };

    this.confirm.emit(request);
    this.visible.set(false);
    this.notes.set(''); // Reset notes
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    this.cancel.emit();
    this.visible.set(false);
    this.notes.set(''); // Reset notes
  }
}
