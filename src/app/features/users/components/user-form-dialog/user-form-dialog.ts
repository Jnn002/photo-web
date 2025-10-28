import {
    Component,
    ChangeDetectionStrategy,
    input,
    output,
    signal,
    computed,
    inject,
    effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import type { UserWithRoles } from '../../models/user.models';
import type { Status } from '@generated/types.gen';

/**
 * UserFormDialogComponent
 *
 * Reusable dialog component for editing user data and roles.
 * Supports role management and user data updates.
 */
@Component({
    selector: 'app-user-form-dialog',
    imports: [
        ReactiveFormsModule,
        DialogModule,
        InputTextModule,
        ButtonModule,
        Select,
        SkeletonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './user-form-dialog.html',
    styleUrl: './user-form-dialog.css',
})
export class UserFormDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly userService = inject(UserService);
    private readonly roleService = inject(RoleService);

    // Inputs
    readonly visible = input.required<boolean>();
    readonly userId = input<number | null>(null);

    // Outputs
    readonly onClose = output<void>();
    readonly onSuccess = output<void>();

    // Local state
    readonly loading = signal(false);
    readonly loadingUser = signal(false);
    readonly currentUser = signal<UserWithRoles | null>(null);

    // Role options from service
    readonly roleOptions = this.roleService.roleOptions;

    // Status options
    readonly statusOptions = [
        { label: 'Activo', value: 'Active' as Status },
        { label: 'Inactivo', value: 'Inactive' as Status },
    ];

    // User form
    readonly userForm = this.fb.nonNullable.group({
        full_name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        status: ['Active' as Status, [Validators.required]],
        roles: [[] as number[], [Validators.required]],
    });

    constructor() {
        // Load user data when dialog opens with a userId
        effect(() => {
            if (this.visible() && this.userId()) {
                this.loadUserData(this.userId()!);
            } else if (!this.visible()) {
                this.resetForm();
            }
        });

        // Roles are loaded by APP_INITIALIZER in app.config.ts
        // No need to load them here
    }

    /**
     * Load user data for editing
     */
    private async loadUserData(userId: number): Promise<void> {
        this.loadingUser.set(true);

        const user = await this.userService.getUserWithRoles(userId);

        if (user) {
            this.currentUser.set(user);

            // Map roles to role IDs for the multiselect
            const roleIds = user.roles?.map((role) => role.id) || [];

            this.userForm.patchValue({
                full_name: user.full_name,
                email: user.email,
                phone: user.phone || '',
                status: user.status,
                roles: roleIds,
            });
        }

        this.loadingUser.set(false);
    }

    /**
     * Reset form and state
     */
    private resetForm(): void {
        this.userForm.reset({
            full_name: '',
            email: '',
            phone: '',
            status: 'Active' as Status,
            roles: [],
        });
        this.currentUser.set(null);
        this.loading.set(false);
        this.loadingUser.set(false);
    }

    /**
     * Handle form submission
     */
    async onSubmit(): Promise<void> {
        if (this.userForm.invalid || !this.userId()) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);

        const formValue = this.userForm.getRawValue();
        const userId = this.userId()!;
        const currentUser = this.currentUser();

        // Update user basic data
        const updateResult = await this.userService.updateUser(userId, {
            full_name: formValue.full_name,
            email: formValue.email,
            phone: formValue.phone || null,
            status: formValue.status,
        });

        if (updateResult) {
            // Update roles if they changed
            const currentRoleIds = currentUser?.roles?.map((role) => role.id) || [];
            const newRoleIds = formValue.roles;

            if (JSON.stringify(currentRoleIds.sort()) !== JSON.stringify(newRoleIds.sort())) {
                await this.userService.updateUserRoles(userId, currentRoleIds, newRoleIds);
            }

            this.loading.set(false);
            this.onSuccess.emit();
        } else {
            this.loading.set(false);
        }
    }

    /**
     * Handle dialog close
     */
    handleClose(): void {
        this.onClose.emit();
    }

    /**
     * Handle role checkbox change
     */
    onRoleChange(roleId: number, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const currentRoles = this.userForm.get('roles')?.value || [];

        if (checkbox.checked) {
            // Add role if not already included
            if (!currentRoles.includes(roleId)) {
                this.userForm.patchValue({
                    roles: [...currentRoles, roleId],
                });
            }
        } else {
            // Remove role
            this.userForm.patchValue({
                roles: currentRoles.filter((id: number) => id !== roleId),
            });
        }
    }

    /**
     * Check if a form field has errors and is touched
     */
    hasFieldError(fieldName: string): boolean {
        const field = this.userForm.get(fieldName);
        return !!(field?.invalid && field?.touched);
    }

    /**
     * Get error message for a field
     */
    getFieldError(fieldName: string): string {
        const control = this.userForm.get(fieldName);

        if (!control) return '';

        if (control.hasError('required')) {
            return `Este campo es requerido`;
        }

        if (control.hasError('email')) {
            return 'Por favor ingresa un email válido';
        }

        if (control.hasError('minlength')) {
            const minLength = control.getError('minlength').requiredLength;
            return `Mínimo ${minLength} caracteres`;
        }

        return '';
    }
}
