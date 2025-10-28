import { Directive, TemplateRef, ViewContainerRef, inject, effect, input } from '@angular/core';
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

    readonly hasPermission = input.required<string | string[]>();
    readonly hasPermissionMode = input<'all' | 'any'>('all');

    constructor() {
        // React to input changes and permission changes
        effect(() => {
            // Track both inputs and auth permissions
            this.hasPermission();
            this.hasPermissionMode();
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
        const permissions = this.hasPermission();
        const mode = this.hasPermissionMode();

        if (typeof permissions === 'string') {
            return this.authService.hasPermission(permissions);
        }

        if (Array.isArray(permissions)) {
            return mode === 'all'
                ? this.authService.hasAllPermissions(permissions)
                : this.authService.hasAnyPermission(permissions);
        }

        return false;
    }
}
