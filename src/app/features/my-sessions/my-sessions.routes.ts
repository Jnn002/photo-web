import { Routes } from '@angular/router';

import { authGuard } from '@core/guards/auth.guard';
import { permissionGuard } from '@core/guards/permission.guard';

/**
 * Routes for photographer's session management
 *
 * All routes require authentication and session.view.own permission
 */
export const MY_SESSIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-sessions').then((m) => m.MySessionsComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      permission: 'session.view.own',
    },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./session-detail/session-detail').then(
        (m) => m.SessionDetailComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      permission: 'session.view.own',
    },
  },
];
