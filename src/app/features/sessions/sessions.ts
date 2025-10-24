import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { SessionListComponent } from './components/session-list';
import { SessionFormDialogComponent } from './components/dialogs/session-form-dialog';
import type { SessionPublic } from './models/session.models';

@Component({
    selector: 'app-sessions',
    imports: [RouterOutlet, SessionListComponent, SessionFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Keep list component alive, just hide it when not needed -->
        <div [style.display]="isListRoute() ? 'block' : 'none'">
            <app-session-list (createClicked)="onCreateSession()" />

            <app-session-form-dialog
                [visible]="showFormDialog()"
                (visibleChange)="onFormVisibleChange($event)"
                (saved)="onSessionSaved($event)"
            />
        </div>

        <!-- Router outlet for detail and edit routes -->
        @if (!isListRoute()) {
        <router-outlet></router-outlet>
        }
    `,
})
export class SessionsComponent {
    private readonly router = inject(Router);

    readonly showFormDialog = signal(false);

    // Reactive URL tracking (Angular 20+ zoneless pattern)
    private readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );

    // Computed signal for route detection
    readonly isListRoute = computed(() => this.currentUrl() === '/sessions');

    onCreateSession(): void {
        this.showFormDialog.set(true);
    }

    onFormVisibleChange(visible: boolean): void {
        this.showFormDialog.set(visible);
    }

    onSessionSaved(session: SessionPublic): void {
        this.showFormDialog.set(false);
        // Navigate to session details
        this.router.navigate(['/sessions', session.id]);
    }
}
