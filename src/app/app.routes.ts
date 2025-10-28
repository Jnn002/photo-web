import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes'),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./core/layout/main-layout').then((m) => m.MainLayoutComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
            },
            {
                path: 'clients',
                loadChildren: () => import('./features/clients/clients.routes'),
            },
            {
                path: 'items',
                loadComponent: () =>
                    import('./features/catalog/items/items').then((m) => m.ItemsComponent),
            },
            {
                path: 'packages',
                loadComponent: () =>
                    import('./features/catalog/packages/packages').then((m) => m.PackagesComponent),
            },
            {
                path: 'rooms',
                loadComponent: () =>
                    import('./features/catalog/rooms/rooms').then((m) => m.RoomsComponent),
            },
            {
                path: 'sessions',
                loadChildren: () => import('./features/sessions/sessions.routes').then(m => m.SESSIONS_ROUTES),
            },
            {
                path: 'users',
                loadChildren: () => import('./features/users/users.routes').then((m) => m.usersRoutes),
            },
        ],
    },
    {
        path: 'unauthorized',
        loadComponent: () =>
            import('./features/unauthorized/unauthorized').then((m) => m.UnauthorizedComponent),
    },
    {
        path: '**',
        redirectTo: '/dashboard',
    },
];
