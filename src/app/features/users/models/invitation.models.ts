/**
 * Invitation models and types for user invitation flow.
 *
 * These interfaces mirror the backend Pydantic schemas from app/invitations/schemas.py
 * and will be replaced by auto-generated types once the API client is regenerated.
 */

/**
 * InvitationCreate - Request DTO for creating a new invitation
 */
export interface InvitationCreate {
    email: string;
    custom_message?: string | null;
}

/**
 * InvitationResponse - Response DTO for invitation creation
 */
export interface InvitationResponse {
    invitation_url: string;
    email: string;
    expires_at: string; // ISO datetime string
    message: string;
}

/**
 * InvitationValidateResponse - Response DTO for invitation validation
 */
export interface InvitationValidateResponse {
    is_valid: boolean;
    email: string | null;
    message: string;
}

/**
 * InvitationResend - Request DTO for resending an invitation
 */
export interface InvitationResend {
    email: string;
    custom_message?: string | null;
}

/**
 * Invitation state for UI management
 */
export interface InvitationState {
    loading: boolean;
    error: string | null;
    lastInvitation: InvitationResponse | null;
}

/**
 * Registration form data (for invitation-based registration)
 */
export interface RegistrationData {
    email: string;
    full_name: string;
    phone?: string | null;
    password: string;
    invitation_token: string;
}
