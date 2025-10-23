import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { SessionService } from '../../services/session.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../core/services/notification';
import { PhotographerRole } from '../../models/session.models';

interface RoleOption {
    label: string;
    value: PhotographerRole;
}

@Component({
    selector: 'app-assign-photographer-dialog',
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, Select],
    templateUrl: './assign-photographer-dialog.html',
    styleUrl: './assign-photographer-dialog.css',
})
export class AssignPhotographerDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly userService = inject(UserService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    private readonly loaded = signal(false);

    // Get photographer options from UserService
    readonly photographerOptions = this.userService.photographerOptions;
    readonly loading = this.userService.loading;

    readonly roleOptions: RoleOption[] = [
        { label: 'Principal', value: PhotographerRole.LEAD },
        { label: 'Asistente', value: PhotographerRole.ASSISTANT },
    ];

    constructor() {
        // Initialize form
        this.form = this.fb.group({
            photographer_id: [null, Validators.required],
            role: [null],
        });

        // Load photographers only once on initialization
        effect(() => {
            if (!this.loaded()) {
                this.userService.loadPhotographers();
                this.loaded.set(true);
            }
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;
            const data = {
                session_id: sessionId,
                photographer_id: this.form.value.photographer_id,
                role: this.form.value.role || null,
            };

            this.sessionService.assignPhotographer(sessionId, data).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Fotógrafo asignado exitosamente');
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error assigning photographer:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al asignar fotógrafo'
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
