import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '@core/services/auth';

/**
 * Structural directive to show/hide elements based on user roles
 *
 * Usage:
 * ```html
 * <!-- Single role -->
 * <div *hasRole="'Admin'">Admin Panel</div>
 *
 * <!-- Multiple roles (requires at least one) -->
 * <div *hasRole="['Admin', 'Manager']">Management Section</div>
 * ```
 */
@Directive({
    selector: '[hasRole]',
})
export class HasRoleDirective {
    private readonly authService = inject(AuthService);
    private readonly templateRef = inject(TemplateRef<unknown>);
    private readonly viewContainer = inject(ViewContainerRef);

    private roles: string | string[] = [];

    @Input()
    set hasRole(value: string | string[]) {
        this.roles = value;
        this.updateView();
    }

    constructor() {
        // React to role changes
        effect(() => {
            // Trigger update when userRoles signal changes
            this.authService.userRoles();
            this.updateView();
        });
    }

    private updateView(): void {
        const hasRole = this.checkRole();

        if (hasRole) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
            this.viewContainer.clear();
        }
    }

    private checkRole(): boolean {
        if (typeof this.roles === 'string') {
            return this.authService.hasRole(this.roles);
        }

        if (Array.isArray(this.roles)) {
            return this.roles.some((role) => this.authService.hasRole(role));
        }

        return false;
    }
}
