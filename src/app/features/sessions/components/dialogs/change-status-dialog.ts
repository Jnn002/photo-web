import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { SessionService } from '../../services/session.service';
import { NotificationService } from '../../../../core/services/notification';
import { SessionStatus, STATUS_BADGE_MAP } from '../../models/session.models';

interface StatusOption {
    label: string;
    value: SessionStatus;
}

@Component({
    selector: 'app-change-status-dialog',
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, Select, Textarea, MessageModule],
    templateUrl: './change-status-dialog.html',
    styleUrl: './change-status-dialog.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeStatusDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    readonly statusOptions = signal<StatusOption[]>([]);
    readonly currentStatus: SessionStatus;

    constructor() {
        this.currentStatus = this.config.data.currentStatus;
        const validTransitions: SessionStatus[] = this.config.data.validTransitions || [];

        // Build status options from valid transitions
        this.statusOptions.set(
            validTransitions.map((status) => ({
                label: STATUS_BADGE_MAP[status].label,
                value: status,
            }))
        );

        // Initialize form
        this.form = this.fb.group({
            to_status: [null, Validators.required],
            reason: [null],
            notes: [null],
        });
    }

    getCurrentStatusLabel(): string {
        return STATUS_BADGE_MAP[this.currentStatus].label;
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;

            const data = {
                to_status: this.form.value.to_status,
                reason: this.form.value.reason || null,
                notes: this.form.value.notes || null,
            };

            this.sessionService.transitionStatus(sessionId, data).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Estado cambiado exitosamente');
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error changing status:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al cambiar el estado'
                    );
                    this.submitting.set(false);
                },
            });
        } else {
            Object.keys(this.form.controls).forEach((key) => {
                this.form.get(key)?.markAsTouched();
            });
        }
    }

    cancel() {
        this.ref.close(false);
    }
}
