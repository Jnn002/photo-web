import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

/**
 * RegisterRedirectComponent
 *
 * Simple component that redirects /register to /auth/register
 * while preserving all query parameters (especially the invitation token).
 *
 * This allows users to click email links with /register?invitation=...
 * and be properly redirected to the auth module.
 */
@Component({
    selector: 'app-register-redirect',
    template: '',
    standalone: true,
})
export class RegisterRedirectComponent {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    constructor() {
        // Get query params from current route
        const queryParams = this.route.snapshot.queryParams;

        // Redirect to /auth/register with the same query params
        this.router.navigate(['/auth/register'], { queryParams });
    }
}
