import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ApiClientConfig } from '@core/config/api-client.config';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast />
        <router-outlet />
    `,
})
export class App {
    // Initialize API client configuration
    private readonly apiConfig = inject(ApiClientConfig);
}
