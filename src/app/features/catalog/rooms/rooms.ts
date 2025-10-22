/**
 * Rooms Container Component
 *
 * Main component for studio rooms management, integrating list, form, and availability dialog.
 */

import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RoomListComponent } from './room-list';
import { RoomFormComponent } from './room-form';
import { RoomAvailabilityDialogComponent } from './room-availability-dialog';
import type { RoomPublic } from '../models/catalog.models';

@Component({
  selector: 'app-rooms',
  imports: [RoomListComponent, RoomFormComponent, RoomAvailabilityDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-room-list
      (createClicked)="onCreateRoom()"
      (editClicked)="onEditRoom($event)"
      (availabilityClicked)="onViewAvailability($event)"
    />

    <app-room-form
      [visible]="formVisible()"
      [room]="selectedRoom()"
      (visibleChange)="onFormVisibleChange($event)"
      (saved)="onRoomSaved($event)"
    />

    <app-room-availability-dialog
      [visible]="availabilityDialogVisible()"
      [room]="viewedRoom()"
      (visibleChange)="onAvailabilityDialogVisibleChange($event)"
    />
  `,
})
export class RoomsComponent {
  readonly formVisible = signal(false);
  readonly selectedRoom = signal<RoomPublic | null>(null);
  readonly availabilityDialogVisible = signal(false);
  readonly viewedRoom = signal<RoomPublic | null>(null);

  onCreateRoom(): void {
    this.selectedRoom.set(null);
    this.formVisible.set(true);
  }

  onEditRoom(room: RoomPublic): void {
    this.selectedRoom.set(room);
    this.formVisible.set(true);
  }

  onViewAvailability(room: RoomPublic): void {
    this.viewedRoom.set(room);
    this.availabilityDialogVisible.set(true);
  }

  onFormVisibleChange(visible: boolean): void {
    this.formVisible.set(visible);
    if (!visible) {
      this.selectedRoom.set(null);
    }
  }

  onAvailabilityDialogVisibleChange(visible: boolean): void {
    this.availabilityDialogVisible.set(visible);
    if (!visible) {
      this.viewedRoom.set(null);
    }
  }

  onRoomSaved(room: RoomPublic): void {
    this.formVisible.set(false);
    this.selectedRoom.set(null);
  }
}
