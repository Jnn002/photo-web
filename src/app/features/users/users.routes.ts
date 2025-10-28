import { Routes } from '@angular/router';
import { UsersListComponent } from './users-list';
import { UserDetailComponent } from './user-detail';

export const usersRoutes: Routes = [
    {
        path: '',
        component: UsersListComponent,
    },
    {
        path: ':id',
        component: UserDetailComponent,
    },
];
