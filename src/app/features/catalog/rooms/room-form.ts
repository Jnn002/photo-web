/**
 * Room Form Component
 *
 * Modal dialog for creating and editing studio rooms.
 * Uses Angular 20 reactive forms with signals and inject().
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';

import { RoomService } from '../services/room.service';
import type { RoomPublic, RoomCreate, RoomUpdate } from '../models/catalog.models';

@Component({
  selector: 'app-room-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    FloatLabelModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-form.html',
  styleUrl: './room-form.css',
})
export class RoomFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly roomService = inject(RoomService);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly room = input<RoomPublic | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly saved = output<RoomPublic>();

  // Local state
  readonly saving = signal(false);

  // Form
  readonly form: FormGroup;

  constructor() {
    // Initialize form
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      capacity: [null, [Validators.min(1)]],
      hourly_rate: [null, [Validators.min(0)]],
    });

    // Update form when room changes
    effect(() => {
      const currentRoom = this.room();
      if (currentRoom) {
        this.form.patchValue({
          name: currentRoom.name,
          description: currentRoom.description,
          capacity: currentRoom.capacity,
          hourly_rate: currentRoom.hourly_rate ? parseFloat(currentRoom.hourly_rate) : null,
        });
      } else {
        this.form.reset({
          name: '',
          description: '',
          capacity: null,
          hourly_rate: null,
        });
      }
    });
  }

  /**
   * Get form title based on edit mode
   */
  get formTitle(): string {
    return this.room() ? 'Editar Sala' : 'Nueva Sala';
  }

  /**
   * Handle dialog close
   */
  onHide(): void {
    this.form.reset();
    this.visibleChange.emit(false);
  }

  /**
   * Handle form submit
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const formValue = this.form.value;
      const currentRoom = this.room();

      let result: RoomPublic | null;

      if (currentRoom) {
        // Update existing room
        const updateData: RoomUpdate = {
          name: formValue.name,
          description: formValue.description || null,
          capacity: formValue.capacity,
          hourly_rate: formValue.hourly_rate,
        };
        result = await this.roomService.updateRoom(currentRoom.id, updateData);
      } else {
        // Create new room
        const createData: RoomCreate = {
          name: formValue.name,
          description: formValue.description || null,
          capacity: formValue.capacity,
          hourly_rate: formValue.hourly_rate,
        };
        result = await this.roomService.createRoom(createData);
      }

      if (result) {
        this.saved.emit(result);
        this.onHide();
      }
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Handle cancel button
   */
  onCancel(): void {
    this.onHide();
  }

  /**
   * Check if form control has error
   */
  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get error message for control
   */
  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['maxLength'])
      return `Máximo ${control.errors['maxLength'].requiredLength} caracteres`;
    if (control.errors['min']) return `Valor mínimo: ${control.errors['min'].min}`;

    return 'Campo inválido';
  }
}
