import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { SessionService } from '../../services/session.service';
import { NotificationService } from '../../../../core/services/notification';
import { PaymentType, PAYMENT_TYPE_LABELS } from '../../models/session.models';

interface PaymentTypeOption {
    label: string;
    value: PaymentType;
}

interface PaymentMethodOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-record-payment-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        Select,
        InputNumber,
        DatePicker,
        InputText,
        Textarea,
    ],
    templateUrl: './record-payment-dialog.html',
    styleUrl: './record-payment-dialog.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPaymentDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly notificationService = inject(NotificationService);
    private readonly config = inject(DynamicDialogConfig);
    private readonly ref = inject(DynamicDialogRef);

    readonly form: FormGroup;
    readonly submitting = signal(false);
    readonly remainingBalance = signal(0);
    readonly maxAmount = signal(0);

    readonly maxDate = new Date(); // Cannot pay in the future

    readonly paymentTypeOptions: PaymentTypeOption[] = [
        { label: PAYMENT_TYPE_LABELS[PaymentType.DEPOSIT], value: PaymentType.DEPOSIT },
        { label: PAYMENT_TYPE_LABELS[PaymentType.BALANCE], value: PaymentType.BALANCE },
        { label: PAYMENT_TYPE_LABELS[PaymentType.PARTIAL], value: PaymentType.PARTIAL },
    ];

    readonly paymentMethodOptions: PaymentMethodOption[] = [
        { label: 'Efectivo', value: 'Cash' },
        { label: 'Tarjeta de Crédito', value: 'Credit Card' },
        { label: 'Tarjeta de Débito', value: 'Debit Card' },
        { label: 'Transferencia Bancaria', value: 'Bank Transfer' },
        { label: 'Cheque', value: 'Check' },
        { label: 'PayPal', value: 'PayPal' },
        { label: 'Otro', value: 'Other' },
    ];

    constructor() {
        const balance = this.config.data.remainingBalance || 0;
        this.remainingBalance.set(balance);
        this.maxAmount.set(balance);

        // Initialize form
        this.form = this.fb.group({
            payment_type: [null, Validators.required],
            amount: [
                null,
                [
                    Validators.required,
                    Validators.min(0.01),
                    Validators.max(this.remainingBalance()),
                ],
            ],
            payment_method: [null, Validators.required],
            payment_date: [new Date(), Validators.required],
            transaction_reference: [null],
            notes: [null],
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.submitting.set(true);
            const sessionId = this.config.data.sessionId;

            // Format payment_date to ISO date string (YYYY-MM-DD)
            const paymentDate = new Date(this.form.value.payment_date);
            const isoDate = paymentDate.toISOString().split('T')[0];

            const data = {
                session_id: sessionId,
                payment_type: this.form.value.payment_type,
                amount: this.form.value.amount,
                payment_method: this.form.value.payment_method,
                payment_date: isoDate,
                transaction_reference: this.form.value.transaction_reference || null,
                notes: this.form.value.notes || null,
            };

            this.sessionService.recordPayment(sessionId, data).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Pago registrado exitosamente');
                    this.ref.close(true);
                },
                error: (error) => {
                    console.error('Error recording payment:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al registrar el pago'
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

    formatCurrency(amount: number | string): string {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return isNaN(numAmount) ? '0.00' : numAmount.toFixed(2);
    }
}
