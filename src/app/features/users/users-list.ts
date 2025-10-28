import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';
import type { UserWithRoles } from './models/user.models';
import { SendInvitationDialogComponent } from './components/send-invitation-dialog/send-invitation-dialog';
import { UserFormDialogComponent } from './components/user-form-dialog/user-form-dialog';

/**
 * UsersListComponent
 *
 * Displays a table of all users in the system with role badges and actions.
 * Allows filtering, searching, and managing users (view/edit).
 */
@Component({
    selector: 'app-users-list',
    imports: [
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        BadgeModule,
        SkeletonModule,
        TooltipModule,
        SendInvitationDialogComponent,
        UserFormDialogComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './users-list.html',
    styleUrl: './users-list.css',
})
export class UsersListComponent {
    private readonly userService = inject(UserService);
    private readonly roleService = inject(RoleService);
    private readonly router = inject(Router);

    // Service signals
    readonly users = this.userService.items;
    readonly total = this.userService.total;
    readonly loading = this.userService.loading;

    // Local UI state
    readonly searchTerm = signal('');
    readonly showInvitationDialog = signal(false);
    readonly showEditDialog = signal(false);
    readonly selectedUserId = signal<number | null>(null);

    // Filtered users based on search term
    readonly filteredUsers = computed(() => {
        const users = this.users();
        const search = this.searchTerm().toLowerCase().trim();

        if (!search) {
            return users;
        }

        return users.filter(
            (user) =>
                user.full_name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search) ||
                (user.phone && user.phone.toLowerCase().includes(search))
        );
    });

    constructor() {
        // Load users and roles on component initialization
        this.loadData();
    }

    /**
     * Load initial data (users)
     */
    private async loadData(): Promise<void> {
        await this.userService.loadUsersWithRoles();
    }

    /**
     * Refresh user list
     */
    async refreshUsers(): Promise<void> {
        await this.userService.loadUsersWithRoles();
    }

    /**
     * Navigate to user detail page
     */
    viewUser(userId: number): void {
        this.router.navigate(['/users', userId]);
    }

    /**
     * Open edit dialog for user
     */
    editUser(userId: number): void {
        this.selectedUserId.set(userId);
        this.showEditDialog.set(true);
    }

    /**
     * Open invitation dialog
     */
    openInvitationDialog(): void {
        this.showInvitationDialog.set(true);
    }

    /**
     * Close invitation dialog
     */
    closeInvitationDialog(): void {
        this.showInvitationDialog.set(false);
    }

    /**
     * Close edit dialog
     */
    closeEditDialog(): void {
        this.showEditDialog.set(false);
        this.selectedUserId.set(null);
    }

    /**
     * Handle successful invitation sent
     */
    onInvitationSent(): void {
        this.closeInvitationDialog();
    }

    /**
     * Handle successful user update
     */
    async onUserUpdated(): Promise<void> {
        this.closeEditDialog();
        await this.refreshUsers();
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

    /**
     * Format user roles for display
     */
    getUserRoles(user: UserWithRoles): string[] {
        return user.roles?.map((role) => role.name) || [];
    }
}
