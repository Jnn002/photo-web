/**
 * Package Form Component
 *
 * Modal dialog for creating and editing catalog packages.
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

import { PackageService } from '../services/package.service';
import type {
    PackagePublic,
    PackageCreate,
    PackageUpdate,
    SessionType,
} from '../models/catalog.models';
import { SESSION_TYPE_OPTIONS } from '../models/catalog.models';

@Component({
    selector: 'app-package-form',
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
    templateUrl: './package-form.html',
    styleUrl: './package-form.css',
})
export class PackageFormComponent {
    private readonly fb = inject(FormBuilder);
    private readonly packageService = inject(PackageService);

    // Inputs
    readonly visible = input.required<boolean>();
    readonly package = input<PackagePublic | null>(null);
    readonly embedded = input<boolean>(false); // New: for embedded mode without dialog

    // Outputs
    readonly visibleChange = output<boolean>();
    readonly saved = output<PackagePublic>();

    // Local state
    readonly saving = signal(false);
    readonly sessionTypeOptions = SESSION_TYPE_OPTIONS;
    private lastPackageId: number | null = null;

    // Form
    readonly form: FormGroup;

    constructor() {
        // Initialize form
        this.form = this.fb.group({
            code: ['', [Validators.required, Validators.maxLength(50)]],
            name: ['', [Validators.required, Validators.maxLength(255)]],
            description: [''],
            session_type: [null, Validators.required],
            base_price: [0, [Validators.required, Validators.min(0)]],
            estimated_editing_days: [
                7,
                [Validators.required, Validators.min(1), Validators.max(365)],
            ],
        });

        // Update form when package changes
        effect(() => {
            const currentPackage = this.package();
            const packageId = currentPackage?.id ?? null;

            // Only update if the package ID actually changed
            if (this.lastPackageId === packageId) {
                return;
            }

            this.lastPackageId = packageId;

            if (currentPackage) {
                // Use patchValue with emitEvent: false to avoid triggering unnecessary change detection
                this.form.patchValue(
                    {
                        code: currentPackage.code,
                        name: currentPackage.name,
                        description: currentPackage.description,
                        session_type: currentPackage.session_type,
                        base_price: parseFloat(currentPackage.base_price),
                        estimated_editing_days: currentPackage.estimated_editing_days,
                    },
                    { emitEvent: false }
                );
            } else {
                // Reset form with default values, also with emitEvent: false
                this.form.reset(
                    {
                        code: '',
                        name: '',
                        description: '',
                        session_type: null,
                        base_price: 0,
                        estimated_editing_days: 7,
                    },
                    { emitEvent: false }
                );
            }
        });
    }

    /**
     * Get form title based on edit mode
     */
    getTitle(): string {
        return this.package() ? 'Editar Paquete' : 'Nuevo Paquete';
    }

    /**
     * Handle form submission
     */
    async onSubmit(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);

        try {
            const formValue = this.form.value;
            const currentPackage = this.package();

            let result: PackagePublic | null;

            if (currentPackage) {
                // Update existing package
                const updateData: PackageUpdate = {
                    code: formValue.code,
                    name: formValue.name,
                    description: formValue.description || null,
                    session_type: formValue.session_type,
                    base_price: formValue.base_price,
                    estimated_editing_days: formValue.estimated_editing_days,
                };
                result = await this.packageService.updatePackage(currentPackage.id, updateData);
            } else {
                // Create new package
                const createData: PackageCreate = {
                    code: formValue.code,
                    name: formValue.name,
                    description: formValue.description || null,
                    session_type: formValue.session_type,
                    base_price: formValue.base_price,
                    estimated_editing_days: formValue.estimated_editing_days,
                };
                result = await this.packageService.createPackage(createData);
            }

            if (result) {
                this.saved.emit(result);
                this.onCancel();
            }
        } finally {
            this.saving.set(false);
        }
    }

    /**
     * Handle dialog cancel
     */
    onCancel(): void {
        this.form.reset();
        this.visibleChange.emit(false);
    }

    /**
     * Check if field has error
     */
    hasError(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    /**
     * Get field error message
     */
    getErrorMessage(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (!field || !field.errors) return '';

        if (field.errors['required']) return 'Este campo es requerido';
        if (field.errors['maxlength'])
            return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
        if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
        if (field.errors['max']) return `El valor máximo es ${field.errors['max'].max}`;

        return 'Campo inválido';
    }

    /**
     * Public method to trigger form submission (for embedded mode)
     */
    submitForm(): void {
        this.onSubmit();
    }

    /**
     * Check if form is valid
     */
    isFormValid(): boolean {
        return this.form.valid;
    }
}
