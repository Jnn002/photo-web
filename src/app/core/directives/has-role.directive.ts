import { Directive, TemplateRef, ViewContainerRef, inject, effect, input } from '@angular/core';
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

    //  Use input() instead of @Input()
    readonly hasRole = input.required<string | string[]>();

    constructor() {
        // React to input changes and role changes
        effect(() => {
            // Track input and auth roles
            this.hasRole();
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
        const roles = this.hasRole();

        if (typeof roles === 'string') {
            return this.authService.hasRole(roles);
        }

        if (Array.isArray(roles)) {
            return roles.some((role) => this.authService.hasRole(role));
        }

        return false;
    }
}
