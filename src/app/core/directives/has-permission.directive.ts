import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '@core/services/auth';

/**
 * Structural directive to show/hide elements based on user permissions
 *
 * Usage:
 * ```html
 * <!-- Single permission -->
 * <button *hasPermission="'user.create'">Create User</button>
 *
 * <!-- Multiple permissions (requires all) -->
 * <button *hasPermission="['user.create', 'user.edit']">Edit User</button>
 *
 * <!-- Any permission (requires at least one) -->
 * <button *hasPermission="['user.view', 'user.list']; mode: 'any'">View Users</button>
 * ```
 */
@Directive({
    selector: '[hasPermission]',
})
export class HasPermissionDirective {
    private readonly authService = inject(AuthService);
    private readonly templateRef = inject(TemplateRef<unknown>);
    private readonly viewContainer = inject(ViewContainerRef);

    private permissions: string | string[] = [];
    private mode: 'all' | 'any' = 'all';

    @Input()
    set hasPermission(value: string | string[]) {
        this.permissions = value;
        this.updateView();
    }

    @Input()
    set hasPermissionMode(value: 'all' | 'any') {
        this.mode = value;
        this.updateView();
    }

    constructor() {
        // React to permission changes
        effect(() => {
            // Trigger update when permissions signal changes
            this.authService.permissions();
            this.updateView();
        });
    }

    private updateView(): void {
        const hasPermission = this.checkPermission();

        if (hasPermission) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
            this.viewContainer.clear();
        }
    }

    private checkPermission(): boolean {
        if (typeof this.permissions === 'string') {
            return this.authService.hasPermission(this.permissions);
        }

        if (Array.isArray(this.permissions)) {
            return this.mode === 'all'
                ? this.authService.hasAllPermissions(this.permissions)
                : this.authService.hasAnyPermission(this.permissions);
        }

        return false;
    }
}
