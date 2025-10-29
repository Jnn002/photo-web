import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
                canActivate: [permissionGuard],
                data: { anyPermission: ['client.view', 'client.create', 'client.edit'] },
            },
            {
                path: 'items',
                loadComponent: () =>
                    import('./features/catalog/items/items').then((m) => m.ItemsComponent),
                canActivate: [permissionGuard],
                data: { anyPermission: ['item.view', 'item.create', 'item.edit'] },
            },
            {
                path: 'packages',
                loadComponent: () =>
                    import('./features/catalog/packages/packages').then((m) => m.PackagesComponent),
                canActivate: [permissionGuard],
                data: { anyPermission: ['package.view', 'package.create', 'package.edit'] },
            },
            {
                path: 'rooms',
                loadComponent: () =>
                    import('./features/catalog/rooms/rooms').then((m) => m.RoomsComponent),
                canActivate: [permissionGuard],
                data: { anyPermission: ['room.view', 'room.create', 'room.edit'] },
            },
            {
                path: 'sessions',
                loadChildren: () => import('./features/sessions/sessions.routes').then(m => m.SESSIONS_ROUTES),
                canActivate: [permissionGuard],
                data: { permission: 'session.view.all' },
            },
            {
                path: 'my-sessions',
                loadChildren: () => import('./features/my-sessions/my-sessions.routes').then(m => m.MY_SESSIONS_ROUTES),
            },
            {
                path: 'users',
                loadChildren: () => import('./features/users/users.routes').then((m) => m.usersRoutes),
                canActivate: [permissionGuard],
                data: { anyPermission: ['user.list', 'user.create', 'user.edit'] },
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
