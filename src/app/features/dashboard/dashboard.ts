import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '@core/services/auth';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [ButtonModule, CardModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.css'],
})
export class DashboardComponent {
    readonly authService = inject(AuthService);
}
