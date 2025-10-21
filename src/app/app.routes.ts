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
            /*{
        path: 'sessions',
        loadComponent: () => import('./features/sessions/sessions').then(m => m.SessionsComponent)
      },
      {
        path: 'my-sessions',
        loadComponent: () => import('./features/sessions/my-sessions').then(m => m.MySessionsComponent)
      },
      {
        path: 'items',
        loadComponent: () => import('./features/items/items').then(m => m.ItemsComponent)
      },
      {
        path: 'packages',
        loadComponent: () => import('./features/packages/packages').then(m => m.PackagesComponent)
      },
      {
        path: 'rooms',
        loadComponent: () => import('./features/rooms/rooms').then(m => m.RoomsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then(m => m.UsersComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.ReportsComponent)
      }*/
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
