/**
 * Client Form Component
 *
 * Form component for creating and editing clients.
 * Uses reactive forms with signals for modern Angular 20+ patterns.
 */

import {
    Component,
    ChangeDetectionStrategy,
    inject,
    effect,
    signal,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { MessageModule } from 'primeng/message';

import { ClientService } from '../services/client.service';
import type { ClientCreate, ClientUpdate } from '../models/client.models';
import { CLIENT_TYPE_OPTIONS, STATUS_OPTIONS } from '../models/client.models';

@Component({
    selector: 'app-client-form',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        Textarea,
        Select,
        MessageModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './client-form.html',
    styleUrl: './client-form.css',
})
export class ClientFormComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly clientService = inject(ClientService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    // Form mode and client ID
    readonly clientId = signal<number | null>(null);
    readonly isEditMode = computed(() => this.clientId() !== null);

    // Loading and error states
    readonly loading = signal(false);
    readonly submitting = signal(false);

    // Form instance
    readonly clientForm: FormGroup;

    // Dropdown options
    readonly clientTypeOptions = CLIENT_TYPE_OPTIONS;
    readonly statusOptions = STATUS_OPTIONS;

    constructor() {
        // Initialize form with validators
        this.clientForm = this.formBuilder.group({
            full_name: [
                '',
                [Validators.required, Validators.minLength(1), Validators.maxLength(100)],
            ],
            email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
            primary_phone: [
                '',
                [Validators.required, Validators.minLength(8), Validators.maxLength(20)],
            ],
            secondary_phone: ['', [Validators.maxLength(20)]],
            delivery_address: [''],
            client_type: [null, Validators.required],
            notes: [''],
            status: ['Active'],
        });

        // Load client data if in edit mode
        effect(() => {
            const params = this.route.snapshot.paramMap;
            const id = params.get('id');

            if (id && id !== 'new') {
                const clientIdNum = parseInt(id, 10);
                if (!isNaN(clientIdNum)) {
                    this.clientId.set(clientIdNum);
                    this.loadClient(clientIdNum);
                }
            } else {
                this.clientId.set(null);
            }
        });
    }

    /**
     * Load client data for editing
     */
    private async loadClient(id: number): Promise<void> {
        this.loading.set(true);
        await this.clientService.loadClient(id);

        const client = this.clientService.currentClient();
        if (client) {
            this.clientForm.patchValue({
                full_name: client.full_name,
                email: client.email,
                primary_phone: client.primary_phone,
                secondary_phone: client.secondary_phone ?? '',
                delivery_address: client.delivery_address ?? '',
                client_type: client.client_type,
                notes: client.notes ?? '',
                status: client.status,
            });
        }
        this.loading.set(false);
    }

    /**
     * Submit form data
     */
    async onSubmit(): Promise<void> {
        if (this.clientForm.invalid) {
            this.clientForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);

        const formValue = this.clientForm.value;

        // Clean up empty strings to null
        const data = {
            ...formValue,
            secondary_phone: formValue.secondary_phone || null,
            delivery_address: formValue.delivery_address || null,
            notes: formValue.notes || null,
        };

        let success = false;

        if (this.isEditMode()) {
            const clientId = this.clientId();
            if (clientId) {
                const updateData: ClientUpdate = data;
                const result = await this.clientService.updateClient(clientId, updateData);
                success = result !== null;
            }
        } else {
            const createData: ClientCreate = {
                full_name: data.full_name,
                email: data.email,
                primary_phone: data.primary_phone,
                secondary_phone: data.secondary_phone,
                delivery_address: data.delivery_address,
                client_type: data.client_type,
                notes: data.notes,
            };
            const result = await this.clientService.createClient(createData);
            success = result !== null;
        }

        this.submitting.set(false);

        if (success) {
            this.router.navigate(['/clients']);
        }
    }

    /**
     * Cancel form and navigate back
     */
    onCancel(): void {
        this.router.navigate(['/clients']);
    }

    /**
     * Check if a field has errors and was touched
     */
    hasError(fieldName: string): boolean {
        const field = this.clientForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    /**
     * Get error message for a field
     */
    getErrorMessage(fieldName: string): string {
        const field = this.clientForm.get(fieldName);
        if (!field || !field.errors || !field.touched) {
            return '';
        }

        if (field.errors['required']) {
            return 'Este campo es requerido';
        }
        if (field.errors['email']) {
            return 'Email inválido';
        }
        if (field.errors['minlength']) {
            return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
        }
        if (field.errors['maxlength']) {
            return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
        }

        return 'Campo inválido';
    }
}
