import { Routes } from '@angular/router';
import { LoginComponent } from './login';

export default [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
] as Routes;
