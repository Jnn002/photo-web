/**
 * Invitation Service
 *
 * Manages user invitations with signals and integrates with the backend API.
 * Follows Angular 20+ best practices with signals-based state management.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from '@core/services/notification';
import type {
    InvitationCreate,
    InvitationResponse,
    InvitationValidateResponse,
    InvitationResend,
    InvitationState,
} from '../models/user.models';

@Injectable({
    providedIn: 'root',
})
export class InvitationService {
    private readonly http = inject(HttpClient);
    private readonly notificationService = inject(NotificationService);
    private readonly apiUrl = `${environment.apiUrl}/invitations`;

    // Private signal for internal state management
    private readonly _state = signal<InvitationState>({
        loading: false,
        error: null,
        lastInvitation: null,
    });

    // Public readonly computed values for component consumption
    readonly loading = computed(() => this._state().loading);
    readonly error = computed(() => this._state().error);
    readonly lastInvitation = computed(() => this._state().lastInvitation);

    /**
     * Create and send a new invitation
     */
    async createInvitation(data: InvitationCreate): Promise<InvitationResponse | null> {
        this._state.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await this.http
                .post<InvitationResponse>(this.apiUrl, data)
                .toPromise();

            if (response) {
                this._state.update((state) => ({
                    ...state,
                    loading: false,
                    lastInvitation: response,
                }));

                this.notificationService.showSuccess(
                    `Invitación enviada exitosamente a ${response.email}`
                );

                return response;
            }

            return null;
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al enviar invitación');
            this._state.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
            return null;
        }
    }

    /**
     * Validate an invitation token
     */
    async validateInvitation(token: string): Promise<InvitationValidateResponse | null> {
        this._state.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await this.http
                .get<InvitationValidateResponse>(`${this.apiUrl}/validate/${token}`)
                .toPromise();

            this._state.update((state) => ({
                ...state,
                loading: false,
            }));

            return response ?? null;
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al validar invitación');
            this._state.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
            return null;
        }
    }

    /**
     * Resend an invitation to an email
     */
    async resendInvitation(data: InvitationResend): Promise<InvitationResponse | null> {
        this._state.update((state) => ({
            ...state,
            loading: true,
            error: null,
        }));

        try {
            const response = await this.http
                .post<InvitationResponse>(`${this.apiUrl}/resend`, data)
                .toPromise();

            if (response) {
                this._state.update((state) => ({
                    ...state,
                    loading: false,
                    lastInvitation: response,
                }));

                this.notificationService.showSuccess(
                    `Invitación reenviada exitosamente a ${response.email}`
                );

                return response;
            }

            return null;
        } catch (error) {
            const errorMessage = this.handleError(error, 'Error al reenviar invitación');
            this._state.update((state) => ({
                ...state,
                loading: false,
                error: errorMessage,
            }));
            return null;
        }
    }

    /**
     * Clear the last invitation from state
     */
    clearLastInvitation(): void {
        this._state.update((state) => ({
            ...state,
            lastInvitation: null,
        }));
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this._state.update((state) => ({
            ...state,
            error: null,
        }));
    }

    /**
     * Handle HTTP errors and show notifications
     */
    private handleError(error: unknown, defaultMessage: string): string {
        let errorMessage = defaultMessage;

        if (error instanceof HttpErrorResponse) {
            if (error.error?.detail) {
                errorMessage = error.error.detail;
            } else if (error.status === 404) {
                errorMessage = 'Invitación no encontrada o expirada';
            } else if (error.status === 400) {
                errorMessage = 'Datos de invitación inválidos';
            } else if (error.status === 409) {
                errorMessage = 'El usuario ya está registrado';
            } else if (error.status === 403) {
                errorMessage = 'No tienes permisos para enviar invitaciones';
            } else if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status >= 500) {
                errorMessage = 'Error del servidor. Por favor, intenta más tarde';
            }
        }

        this.notificationService.showError(errorMessage);
        return errorMessage;
    }
}
