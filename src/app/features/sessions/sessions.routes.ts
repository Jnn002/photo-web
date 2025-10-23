import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { SessionsComponent } from './sessions';
import { SessionFormComponent } from './components/session-form';
import { SessionDetailsComponent } from './components/session-details';

export const SESSIONS_ROUTES: Routes = [
  {
    path: '',
    component: SessionsComponent,
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'session.view.all' },
    children: [
      {
        path: ':id',
        component: SessionDetailsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'session.view.all' },
      },
      {
        path: ':id/edit',
        component: SessionFormComponent,
        canActivate: [permissionGuard],
        data: { permission: 'session.edit.pre-assigned' },
      },
    ],
  },
];
