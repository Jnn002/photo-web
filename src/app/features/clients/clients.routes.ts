/**
 * Clients Feature Routes
 *
 * Defines the routing configuration for the clients feature.
 * All routes are lazy-loaded for optimal performance.
 */

import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./clients').then((m) => m.ClientsComponent),
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./components/client-form').then((m) => m.ClientFormComponent),
    },
    {
        path: ':id',
        loadComponent: () =>
            import('./components/client-details').then((m) => m.ClientDetailsComponent),
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./components/client-form').then((m) => m.ClientFormComponent),
    },
] as Routes;
