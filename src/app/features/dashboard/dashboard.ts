import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ButtonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <p-card>
        <ng-template pTemplate="header">
          <h2>Dashboard</h2>
        </ng-template>

        <p>Welcome, <strong>{{ authService.userName() }}</strong>!</p>
        <p>Email: {{ authService.userEmail() }}</p>

        @if (authService.userRoles().length > 0) {
          <p>Role: <strong>{{ authService.userRoles()[0]?.name }}</strong></p>
        }

        @if (authService.isAdmin()) {
          <p class="admin-badge">✨ Administrator Access</p>
        }

        <ng-template pTemplate="footer">
          <p-button
            label="Logout"
            icon="pi pi-sign-out"
            severity="secondary"
            (onClick)="authService.logout()"
          />
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .admin-badge {
      color: var(--p-primary-color);
      font-weight: bold;
      margin-top: 1rem;
    }

    p {
      margin: 0.5rem 0;
    }
  `]
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
}
