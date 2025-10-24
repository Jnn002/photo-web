import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-unauthorized',
    imports: [CardModule, ButtonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="unauthorized-container">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="text-center">
                        <i class="pi pi-lock" style="font-size: 4rem; color: var(--p-red-500);"></i>
                    </div>
                </ng-template>

                <h2 class="text-center">Access Denied</h2>
                <p class="text-center">You don't have permission to access this resource.</p>

                <ng-template pTemplate="footer">
                    <div class="text-center">
                        <p-button
                            label="Go to Dashboard"
                            icon="pi pi-home"
                            routerLink="/dashboard"
                        />
                    </div>
                </ng-template>
            </p-card>
        </div>
    `,
    styles: [
        `
            .unauthorized-container {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 2rem;
            }

            h2 {
                margin: 1rem 0;
            }

            p {
                margin: 1rem 0;
                color: var(--p-text-muted-color);
            }
        `,
    ],
})
export class UnauthorizedComponent {}
