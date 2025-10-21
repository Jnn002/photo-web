/**
 * Item Form Component
 *
 * Modal dialog for creating and editing catalog items.
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
import { Select } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';

import { ItemService } from '../services/item.service';
import type { ItemPublic, ItemCreate, ItemUpdate, ItemType } from '../models/catalog.models';
import { ITEM_TYPE_OPTIONS } from '../models/catalog.models';

@Component({
  selector: 'app-item-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    Select,
    FloatLabelModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-form.html',
  styleUrl: './item-form.css',
})
export class ItemFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemService);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly item = input<ItemPublic | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly saved = output<ItemPublic>();

  // Local state
  readonly saving = signal(false);
  readonly itemTypeOptions = ITEM_TYPE_OPTIONS;

  // Form
  readonly form: FormGroup;

  constructor() {
    // Initialize form
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      item_type: [null, Validators.required],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      unit_measure: ['', [Validators.required, Validators.maxLength(50)]],
      default_quantity: [1, Validators.min(1)],
    });

    // Update form when item changes
    effect(() => {
      const currentItem = this.item();
      if (currentItem) {
        this.form.patchValue({
          code: currentItem.code,
          name: currentItem.name,
          description: currentItem.description,
          item_type: currentItem.item_type,
          unit_price: parseFloat(currentItem.unit_price),
          unit_measure: currentItem.unit_measure,
          default_quantity: currentItem.default_quantity,
        });
      } else {
        this.form.reset({
          code: '',
          name: '',
          description: '',
          item_type: null,
          unit_price: 0,
          unit_measure: '',
          default_quantity: 1,
        });
      }
    });
  }

  /**
   * Get form title based on edit mode
   */
  get formTitle(): string {
    return this.item() ? 'Editar Item' : 'Nuevo Item';
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
      const currentItem = this.item();

      let result: ItemPublic | null;

      if (currentItem) {
        // Update existing item
        const updateData: ItemUpdate = {
          code: formValue.code,
          name: formValue.name,
          description: formValue.description || null,
          item_type: formValue.item_type,
          unit_price: formValue.unit_price,
          unit_measure: formValue.unit_measure,
          default_quantity: formValue.default_quantity,
        };
        result = await this.itemService.updateItem(currentItem.id, updateData);
      } else {
        // Create new item
        const createData: ItemCreate = {
          code: formValue.code,
          name: formValue.name,
          description: formValue.description || null,
          item_type: formValue.item_type,
          unit_price: formValue.unit_price,
          unit_measure: formValue.unit_measure,
          default_quantity: formValue.default_quantity,
        };
        result = await this.itemService.createItem(createData);
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
