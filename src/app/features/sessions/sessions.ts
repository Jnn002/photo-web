import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionListComponent } from './components/session-list';
import { SessionFormDialogComponent } from './components/dialogs/session-form-dialog';
import type { SessionPublic } from './models/session.models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [RouterOutlet, SessionListComponent, SessionFormDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Show list only on base route -->
    @if (isListRoute()) {
      <app-session-list
        (createClicked)="onCreateSession()"
      />

      <app-session-form-dialog
        [visible]="showFormDialog()"
        (visibleChange)="onFormVisibleChange($event)"
        (saved)="onSessionSaved($event)"
      />
    } @else {
      <!-- Show router outlet for detail and edit routes -->
      <router-outlet></router-outlet>
    }
  `,
})
export class SessionsComponent {
  private readonly router = inject(Router);

  readonly showFormDialog = signal(false);

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

  isListRoute(): boolean {
    // Show list component only when on base /sessions route
    return this.router.url === '/sessions';
  }
}
