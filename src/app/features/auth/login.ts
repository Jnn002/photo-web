import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth';
import { NotificationService } from '@core/services/notification';
import { PASSWORD_REQUIREMENTS } from '@core/constants/security.constants';

/**
 * UPDATED LoginComponent
 * SECURITY IMPROVEMENTS:
 * - Updated password min length to match security constants
 * - Sanitized error messages
 */
@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly notification = inject(NotificationService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly loginForm = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(PASSWORD_REQUIREMENTS.MIN_LENGTH)]],
    });

    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        const { email, password } = this.loginForm.getRawValue();

        this.authService.login({ email, password }).subscribe({
            next: () => {
                this.loading.set(false);
                this.notification.showSuccess('Login successful');

                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
                this.router.navigateByUrl(returnUrl);
            },
            error: () => {
                this.loading.set(false);
                // SECURITY: Generic error message to prevent user enumeration
                this.error.set('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
            },
        });
    }
}
