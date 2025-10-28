import {
    Component,
    ChangeDetectionStrategy,
    input,
    output,
    signal,
    inject,
    effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InvitationService } from '../../services/invitation.service';

/**
 * SendInvitationDialogComponent
 *
 * Reusable dialog component for sending user invitations.
 * Includes form validation and integrates with InvitationService.
 */
@Component({
    selector: 'app-send-invitation-dialog',
    imports: [
        ReactiveFormsModule,
        DialogModule,
        InputTextModule,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './send-invitation-dialog.html',
    styleUrl: './send-invitation-dialog.css',
})
export class SendInvitationDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly invitationService = inject(InvitationService);

    // Inputs
    readonly visible = input.required<boolean>();

    // Outputs
    readonly onClose = output<void>();
    readonly onSuccess = output<void>();

    // Local state
    readonly loading = signal(false);

    // Invitation form
    readonly invitationForm = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        custom_message: [''],
    });

    constructor() {
        // Reset form when dialog is opened
        effect(() => {
            if (this.visible()) {
                this.invitationForm.reset();
                this.loading.set(false);
            }
        });
    }

    /**
     * Handle form submission
     */
    async onSubmit(): Promise<void> {
        if (this.invitationForm.invalid) {
            this.invitationForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);

        const formValue = this.invitationForm.getRawValue();
        const result = await this.invitationService.createInvitation({
            email: formValue.email,
            custom_message: formValue.custom_message || null,
        });

        this.loading.set(false);

        if (result) {
            this.onSuccess.emit();
        }
    }

    /**
     * Handle dialog close
     */
    handleClose(): void {
        this.onClose.emit();
    }

    /**
     * Check if a form field has errors and is touched
     */
    hasFieldError(fieldName: string): boolean {
        const field = this.invitationForm.get(fieldName);
        return !!(field?.invalid && field?.touched);
    }

    /**
     * Get error message for email field
     */
    getEmailError(): string {
        const emailControl = this.invitationForm.get('email');

        if (emailControl?.hasError('required')) {
            return 'El email es requerido';
        }

        if (emailControl?.hasError('email')) {
            return 'Por favor ingresa un email válido';
        }

        return '';
    }
}
