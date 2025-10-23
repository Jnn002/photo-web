import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { SessionService } from '../../services/session.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../core/services/notification';

@Component({
    selector: 'app-assign-editor-dialog',
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, Select, MessageModule],
    templateUrl: './assign-editor-dialog.html',
    styleUrl: './assign-editor-dialog.css',
})
export class AssignEditorDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly userService = inject(UserService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    private readonly loaded = signal(false);

    // Get editor options from UserService
    readonly editorOptions = this.userService.editorOptions;
    readonly loading = this.userService.loading;

    constructor() {
        // Initialize form
        this.form = this.fb.group({
            editor_id: [null, Validators.required],
        });

        // Load editors only once on initialization
        effect(() => {
            if (!this.loaded()) {
                this.userService.loadEditors();
                this.loaded.set(true);
            }
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;
            const data = {
                editor_id: this.form.value.editor_id,
            };

            this.sessionService.assignEditor(sessionId, data).subscribe({
                next: () => {
                    this.notificationService.showSuccess(
                        'Editor asignado y sesión transicionada a En Edición'
                    );
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error assigning editor:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al asignar editor'
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
