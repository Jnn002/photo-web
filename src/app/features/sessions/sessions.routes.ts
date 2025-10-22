import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { SessionsComponent } from './sessions';
import { SessionListComponent } from './components/session-list';
import { SessionFormComponent } from './components/session-form';
import { SessionDetailsComponent } from './components/session-details';

export const SESSIONS_ROUTES: Routes = [
  {
    path: '',
    component: SessionsComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: SessionListComponent,
        canActivate: [permissionGuard],
        data: { permission: 'session.view.all' },
      },
      {
        path: 'create',
        component: SessionFormComponent,
        canActivate: [permissionGuard],
        data: { permission: 'session.create' },
      },
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
