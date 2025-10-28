import { Component, ChangeDetectionStrategy, signal, inject, effect, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import { InvitationService } from '@features/users/services/invitation.service';
import type { RegistrationData } from '@features/users/models/user.models';

/**
 * RegistrationComponent
 *
 * Handles user registration via invitation token.
 * Users receive an invitation email with a token and use it to complete registration.
 */
@Component({
    selector: 'app-register',
    imports: [
        ReactiveFormsModule,
        CardModule,
        InputTextModule,
        PasswordModule,
        ButtonModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './register.html',
    styleUrl: './register.css',
})
export class RegisterComponent {
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly notification = inject(NotificationService);
    private readonly invitationService = inject(InvitationService);

    // Get query params reactively
    private readonly queryParams = toSignal(this.route.queryParamMap);
    readonly invitationToken = computed(() => this.queryParams()?.get('invitation') ?? null);

    // State signals
    readonly loading = signal(false);
    readonly validatingToken = signal(false);
    readonly error = signal<string | null>(null);
    readonly invitationEmail = signal<string | null>(null);
    readonly tokenValid = signal(false);

    // Registration form
    readonly registerForm = this.fb.nonNullable.group(
        {
            email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
            full_name: ['', [Validators.required, Validators.minLength(3)]],
            phone: [''],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]],
        },
        { validators: this.passwordMatchValidator }
    );

    constructor() {
        // Validate invitation token when component loads
        effect(() => {
            const token = this.invitationToken();
            if (token) {
                this.validateInvitationToken(token);
            } else {
                this.error.set('Token de invitación no proporcionado');
            }
        });
    }

    /**
     * Validate invitation token and pre-fill email
     */
    private async validateInvitationToken(token: string): Promise<void> {
        this.validatingToken.set(true);
        this.error.set(null);

        const result = await this.invitationService.validateInvitation(token);

        this.validatingToken.set(false);

        if (result && result.is_valid && result.email) {
            this.tokenValid.set(true);
            this.invitationEmail.set(result.email);
            this.registerForm.patchValue({ email: result.email });
        } else {
            this.tokenValid.set(false);
            this.error.set(
                result?.message || 'Invitación inválida o expirada. Por favor, solicita una nueva invitación.'
            );
        }
    }

    /**
     * Custom validator to check if passwords match
     */
    private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
        const password = control.get('password');
        const confirmPassword = control.get('confirmPassword');

        if (!password || !confirmPassword) {
            return null;
        }

        return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    }

    /**
     * Check if passwords match error should be shown
     */
    get passwordMismatch(): boolean {
        return (
            this.registerForm.hasError('passwordMismatch') &&
            (this.registerForm.get('confirmPassword')?.touched ?? false)
        );
    }

    /**
     * Handle form submission
     */
    async onSubmit(): Promise<void> {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        const token = this.invitationToken();
        if (!token) {
            this.error.set('Token de invitación no válido');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        const formValue = this.registerForm.getRawValue();

        const registrationData: RegistrationData = {
            email: formValue.email,
            full_name: formValue.full_name,
            phone: formValue.phone || null,
            password: formValue.password,
            invitation_token: token,
        };

        try {
            await this.http
                .post(`${environment.apiUrl}/auth/register`, registrationData)
                .toPromise();

            this.loading.set(false);
            this.notification.showSuccess(
                'Registro exitoso. Por favor, inicia sesión con tus credenciales.'
            );

            // Redirect to login page
            this.router.navigate(['/auth/login']);
        } catch (err: unknown) {
            this.loading.set(false);
            const error = err as { error?: { detail?: string } };
            this.error.set(error.error?.detail || 'Error al registrar usuario. Por favor, intenta nuevamente.');
        }
    }

    /**
     * Navigate back to login
     */
    goToLogin(): void {
        this.router.navigate(['/auth/login']);
    }
}
