import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SessionService } from '../../services/session.service';
import { ItemService } from '../../../catalog/services/item.service';
import { NotificationService } from '../../../../core/services/notification';
import type { ItemPublic } from '../../../catalog/models/catalog.models';

interface ItemOption {
    label: string;
    value: number;
    item: ItemPublic;
}

@Component({
    selector: 'app-add-item-to-session-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        Select,
        InputNumber,
        MessageModule,
    ],
    templateUrl: './add-item-to-session-dialog.html',
    styleUrl: './add-item-to-session-dialog.css',
})
export class AddItemToSessionDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly itemService = inject(ItemService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    readonly selectedItem = signal<ItemPublic | null>(null);
    private readonly loaded = signal(false);

    // Get item options from ItemService
    readonly itemOptions = computed(() =>
        this.itemService.items().map((item) => ({
            label: `${item.code} - ${item.name}`,
            value: item.id,
            item: item,
        }))
    );

    readonly loading = this.itemService.loading;

    // Calculate subtotal based on selected item and quantity
    readonly subtotal = computed(() => {
        const item = this.selectedItem();
        const quantity = this.form?.get('quantity')?.value || 0;
        if (item && quantity > 0) {
            return parseFloat(item.unit_price) * quantity;
        }
        return 0;
    });

    constructor() {
        // Initialize form
        this.form = this.fb.group({
            item_id: [null, Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
        });

        // Watch for item selection changes
        this.form.get('item_id')?.valueChanges.subscribe((itemId) => {
            if (itemId) {
                const selectedOption = this.itemOptions().find((opt) => opt.value === itemId);
                this.selectedItem.set(selectedOption?.item || null);
            } else {
                this.selectedItem.set(null);
            }
        });

        // Load items only once on initialization
        effect(() => {
            if (!this.loaded()) {
                this.itemService.loadItems();
                this.loaded.set(true);
            }
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;
            const itemId = this.form.value.item_id;
            const quantity = this.form.value.quantity;

            this.sessionService.addItemToSession(sessionId, itemId, quantity).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Item agregado exitosamente');
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error adding item to session:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al agregar item'
                    );
                    this.submitting.set(false);
                },
            });
        } else {
            Object.keys(this.form.controls).forEach((key) => {
                this.form.get(key)?.markAsTouched();
            });
        }
    }

    cancel() {
        this.ref.close(false);
    }

    formatCurrency(amount: number): string {
        return amount.toFixed(2);
    }

    // Helper to parse string to float for template
    parseFloat(value: string): number {
        return parseFloat(value);
    }
}
