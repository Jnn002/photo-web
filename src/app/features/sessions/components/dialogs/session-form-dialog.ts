import { Component, inject, signal, computed, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { SessionService } from '../../services/session.service';
import { ClientService } from '../../../clients/services/client.service';
import { RoomService } from '../../../catalog/services/room.service';
import { NotificationService } from '../../../../core/services/notification';
import { SessionType, SESSION_TYPE_LABELS, SessionPublic } from '../../models/session.models';

interface SessionTypeOption {
    label: string;
    value: SessionType;
}

@Component({
    selector: 'app-session-form-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputText,
        Textarea,
        Select,
        DatePicker,
        InputNumber,
    ],
    templateUrl: './session-form-dialog.html',
    styleUrl: './session-form-dialog.css',
})
export class SessionFormDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly sessionService = inject(SessionService);
    private readonly clientService = inject(ClientService);
    private readonly roomService = inject(RoomService);
    private readonly notificationService = inject(NotificationService);

    // Inputs
    readonly visible = input.required<boolean>();

    // Outputs
    readonly visibleChange = output<boolean>();
    readonly saved = output<SessionPublic>();

    readonly sessionForm: FormGroup;
    readonly submitting = signal(false);

    // Loading states from services
    readonly loadingClients = this.clientService.loading;
    readonly loadingRooms = this.roomService.loading;

    // Client options from ClientService
    readonly clientOptions = computed(() =>
        this.clientService.items().map((client) => ({
            label: client.full_name,
            value: client.id,
        }))
    );

    // Room options from RoomService (only active rooms)
    readonly roomOptions = computed(() =>
        this.roomService.rooms().map((room) => ({
            label: room.name,
            value: room.id,
        }))
    );

    readonly minDate = new Date(); // Today (cannot schedule in the past)

    readonly sessionTypeOptions: SessionTypeOption[] = [
        { label: SESSION_TYPE_LABELS[SessionType.STUDIO], value: SessionType.STUDIO },
        { label: SESSION_TYPE_LABELS[SessionType.EXTERNAL], value: SessionType.EXTERNAL },
    ];

    constructor() {
        // Initialize form
        this.sessionForm = this.fb.group({
            client_id: [null, Validators.required],
            session_type: [null, Validators.required],
            session_date: [null, Validators.required],
            session_time: [null],
            estimated_duration_hours: [2],
            location: [null],
            room_id: [null],
            client_requirements: [null],
        });

        // Load clients and rooms when component is initialized
        this.clientService.loadClients();
        this.roomService.loadRooms();
    }

    onSessionTypeChange() {
        const sessionType = this.sessionForm.get('session_type')?.value;

        if (sessionType === SessionType.STUDIO) {
            // Studio session requires room
            this.sessionForm.get('room_id')?.setValidators([Validators.required]);
            this.sessionForm.get('location')?.clearValidators();
            this.sessionForm.get('location')?.setValue(null);
        } else if (sessionType === SessionType.EXTERNAL) {
            // External session requires location
            this.sessionForm.get('location')?.setValidators([Validators.required]);
            this.sessionForm.get('room_id')?.clearValidators();
            this.sessionForm.get('room_id')?.setValue(null);
        }

        this.sessionForm.get('room_id')?.updateValueAndValidity();
        this.sessionForm.get('location')?.updateValueAndValidity();
    }

    isStudioSession(): boolean {
        return this.sessionForm.get('session_type')?.value === SessionType.STUDIO;
    }

    isExternalSession(): boolean {
        return this.sessionForm.get('session_type')?.value === SessionType.EXTERNAL;
    }

    onSubmit() {
        if (this.sessionForm.valid) {
            this.submitting.set(true);

            const formValue = this.sessionForm.value;

            // Format session_date to ISO date string (YYYY-MM-DD)
            const sessionDate = new Date(formValue.session_date);
            const isoDate = sessionDate.toISOString().split('T')[0];

            const sessionData = {
                client_id: formValue.client_id,
                session_type: formValue.session_type,
                session_date: isoDate,
                session_time: formValue.session_time || null,
                estimated_duration_hours: formValue.estimated_duration_hours || null,
                location: formValue.location || null,
                room_id: formValue.room_id || null,
                client_requirements: formValue.client_requirements || null,
            };

            this.sessionService.createSession(sessionData).subscribe({
                next: (session) => {
                    this.notificationService.showSuccess('Sesión creada exitosamente');
                    this.saved.emit(session);
                    this.submitting.set(false);
                },
                error: (error) => {
                    console.error('Error creating session:', error);
                    this.notificationService.showError(
                        error.error?.detail || 'Error al crear la sesión'
                    );
                    this.submitting.set(false);
                },
            });
        } else {
            Object.keys(this.sessionForm.controls).forEach((key) => {
                this.sessionForm.get(key)?.markAsTouched();
            });
        }
    }

    onHide() {
        this.visibleChange.emit(false);
        // Reset form when dialog closes
        this.sessionForm.reset({
            client_id: null,
            session_type: null,
            session_date: null,
            session_time: null,
            estimated_duration_hours: 2,
            location: null,
            room_id: null,
            client_requirements: null,
        });
    }
}
