/**
 * User models and types for the users feature.
 *
 * This module re-exports types from the generated API client
 * and defines additional UI-specific types for user management.
 */

// Import and re-export types from generated API client
import type {
    UserPublic as GeneratedUserPublic,
    UserWithRoles as GeneratedUserWithRoles,
    RolePublic as GeneratedRolePublic,
    PaginatedResponseUserPublic as GeneratedPaginatedResponseUserPublic,
} from '@generated/types.gen';

export type UserPublic = GeneratedUserPublic;
export type UserWithRoles = GeneratedUserWithRoles;
export type RolePublic = GeneratedRolePublic;
export type PaginatedResponseUserPublic = GeneratedPaginatedResponseUserPublic;

/**
 * Paginated response for users with roles (from /with-roles endpoint)
 * This type matches the structure returned by the /api/v1/users/with-roles endpoint
 */
export interface PaginatedResponseUserWithRoles {
    items: UserWithRoles[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

/**
 * User filter options for the user list component
 */
export interface UserFilters {
    activeOnly: boolean;
    roleFilter: string | null; // Filter by role name
    search: string;
}

/**
 * User list state for the service
 */
export interface UserListState {
    items: UserPublic[];
    total: number;
    loading: boolean;
    error: string | null;
    filters: UserFilters;
    pagination: {
        limit: number;
        offset: number;
    };
}

/**
 * User option for dropdowns (photographers, editors)
 */
export interface UserOption {
    label: string;
    value: number;
}

/**
 * Helper function to check if user has a specific role
 */
export function userHasRole(user: UserWithRoles, roleName: string): boolean {
    return user.roles?.some((role) => role.name.toLowerCase() === roleName.toLowerCase()) ?? false;
}

/**
 * Helper function to filter users by role name
 */
export function filterUsersByRole(users: UserWithRoles[], roleName: string): UserWithRoles[] {
    return users.filter((user) => userHasRole(user, roleName));
}

/**
 * Helper function to convert users to dropdown options
 */
export function usersToOptions(users: UserPublic[]): UserOption[] {
    return users.map((user) => ({
        label: user.full_name,
        value: user.id,
    }));
}

/**
 * Common role names used in the system
 */
export const ROLE_NAMES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator',
    PHOTOGRAPHER: 'photographer',
    EDITOR: 'editor',
    USER: 'user',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

// Export invitation-related models
export type {
    InvitationCreate,
    InvitationResponse,
    InvitationValidateResponse,
    InvitationResend,
    InvitationState,
    RegistrationData,
} from './invitation.models';
