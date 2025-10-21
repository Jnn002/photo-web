/**
 * Client models and types for the clients feature.
 *
 * This module re-exports types from the generated API client
 * and defines additional UI-specific types for the clients feature.
 */

// Import and re-export types from generated API client
import type {
    ClientPublic as GeneratedClientPublic,
    ClientCreate as GeneratedClientCreate,
    ClientUpdate as GeneratedClientUpdate,
    ClientType as GeneratedClientType,
    Status as GeneratedStatus,
    PaginatedResponseClientPublic as GeneratedPaginatedResponseClientPublic,
} from '@generated/types';

export type ClientPublic = GeneratedClientPublic;
export type ClientCreate = GeneratedClientCreate;
export type ClientUpdate = GeneratedClientUpdate;
export type ClientType = GeneratedClientType;
export type Status = GeneratedStatus;
export type PaginatedResponseClientPublic = GeneratedPaginatedResponseClientPublic;

/**
 * Client filter options for the client list component
 */
export interface ClientFilters {
    activeOnly: boolean;
    clientType: ClientType | null;
    search: string;
}

/**
 * Client table column definitions
 */
export interface ClientTableColumn {
    field: keyof ClientPublic | 'actions';
    header: string;
    sortable?: boolean;
    filterable?: boolean;
}

/**
 * Client action types for the table
 */
export type ClientAction = 'view' | 'edit' | 'delete' | 'reactivate';

/**
 * Client list state for the service
 */
export interface ClientListState {
    items: ClientPublic[];
    total: number;
    loading: boolean;
    error: string | null;
    filters: ClientFilters;
    pagination: {
        limit: number;
        offset: number;
    };
}

/**
 * Client details state
 */
export interface ClientDetailsState {
    client: ClientPublic | null;
    loading: boolean;
    error: string | null;
}

/**
 * Client form mode (create or edit)
 */
export type ClientFormMode = 'create' | 'edit';

/**
 * Client type options for dropdowns
 */
export const CLIENT_TYPE_OPTIONS: Array<{ label: string; value: ClientType }> = [
    { label: 'Personal', value: 'Individual' },
    { label: 'Institucional', value: 'Institutional' },
];

/**
 * Status options for dropdowns
 */
export const STATUS_OPTIONS: Array<{ label: string; value: Status }> = [
    { label: 'Activo', value: 'Active' },
    { label: 'Inactivo', value: 'Inactive' },
];

/**
 * Get display label for client type
 */
export function getClientTypeLabel(clientType: ClientType): string {
    const option = CLIENT_TYPE_OPTIONS.find((opt) => opt.value === clientType);
    return option?.label ?? clientType;
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: Status): string {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.label ?? status;
}

/**
 * Get severity for PrimeNG tag based on client type
 */
export function getClientTypeSeverity(
    clientType: ClientType,
): 'info' | 'success' | 'warn' | 'danger' {
    switch (clientType) {
        case 'Individual':
            return 'info';
        case 'Institutional':
            return 'success';
        default:
            return 'info';
    }
}

/**
 * Get severity for PrimeNG tag based on status
 */
export function getStatusSeverity(status: Status): 'info' | 'success' | 'warn' | 'danger' {
    switch (status) {
        case 'Active':
            return 'success';
        case 'Inactive':
            return 'danger';
        case 'Maintenance':
            return 'warn';
        default:
            return 'info';
    }
}
