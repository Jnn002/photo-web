import { Routes } from '@angular/router';
import { LoginComponent } from './login';
import { RegisterComponent } from './register';

export default [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
] as Routes;
