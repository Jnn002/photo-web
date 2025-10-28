import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';
import type { UserWithRoles } from './models/user.models';
import { UserFormDialogComponent } from './components/user-form-dialog/user-form-dialog';

/**
 * UserDetailComponent
 *
 * Displays detailed information about a specific user.
 * Shows user profile, roles, status, and activity metrics.
 */
@Component({
    selector: 'app-user-detail',
    imports: [
        DatePipe,
        CardModule,
        ButtonModule,
        BadgeModule,
        SkeletonModule,
        DividerModule,
        UserFormDialogComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './user-detail.html',
    styleUrl: './user-detail.css',
})
export class UserDetailComponent {
    private readonly userService = inject(UserService);
    private readonly roleService = inject(RoleService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    // Get route params reactively
    private readonly routeParams = toSignal(this.route.paramMap);
    readonly userId = computed(() => {
        const id = this.routeParams()?.get('id');
        return id ? parseInt(id, 10) : null;
    });

    // Local state
    readonly loading = signal(false);
    readonly user = signal<UserWithRoles | null>(null);
    readonly showEditDialog = signal(false);

    constructor() {
        // Load user data when userId changes
        this.loadUserData();
    }

    /**
     * Load user data from service
     */
    private async loadUserData(): Promise<void> {
        const id = this.userId();

        if (!id) {
            this.router.navigate(['/users']);
            return;
        }

        this.loading.set(true);

        const userData = await this.userService.getUserWithRoles(id);

        if (userData) {
            this.user.set(userData);
        } else {
            // User not found, redirect to list
            this.router.navigate(['/users']);
        }

        this.loading.set(false);
    }

    /**
     * Navigate back to user list
     */
    goBack(): void {
        this.router.navigate(['/users']);
    }

    /**
     * Open edit dialog
     */
    openEditDialog(): void {
        this.showEditDialog.set(true);
    }

    /**
     * Close edit dialog
     */
    closeEditDialog(): void {
        this.showEditDialog.set(false);
    }

    /**
     * Handle successful user update
     */
    async onUserUpdated(): Promise<void> {
        this.closeEditDialog();
        await this.loadUserData();
    }

    /**
     * Get role badge severity based on role name
     */
    getRoleBadgeSeverity(roleName: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            admin: 'danger',
            coordinator: 'warn',
            photographer: 'info',
            editor: 'success',
            user: 'secondary',
        };

        return severityMap[roleName.toLowerCase()] || 'secondary';
    }

    /**
     * Get role display name in Spanish
     */
    getRoleDisplayName(roleName: string): string {
        const displayNames: Record<string, string> = {
            admin: 'Administrador',
            coordinator: 'Coordinador',
            photographer: 'Fotógrafo',
            editor: 'Editor',
            user: 'Usuario',
        };

        return displayNames[roleName.toLowerCase()] || roleName;
    }

    /**
     * Get status badge severity
     */
    getStatusBadgeSeverity(status: string): 'success' | 'secondary' {
        return status === 'Active' ? 'success' : 'secondary';
    }

    /**
     * Get status display text
     */
    getStatusText(status: string): string {
        return status === 'Active' ? 'Activo' : 'Inactivo';
    }
}
