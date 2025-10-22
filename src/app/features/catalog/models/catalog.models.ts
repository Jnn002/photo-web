/**
 * Catalog Models
 *
 * Re-exports and utility functions for catalog-related types from the generated API client.
 * Provides helper functions for UI display (labels, severity, etc.)
 */

// Re-export types from generated client
export type {
  ItemPublic,
  ItemCreate,
  ItemUpdate,
  PackagePublic,
  PackageCreate,
  PackageUpdate,
  PackageDetail,
  PackageItemCreate,
  PackageItemDetail,
  RoomPublic,
  RoomCreate,
  RoomUpdate,
  ItemType,
  SessionType,
  Status,
  PaginatedResponseItemPublic,
  PaginatedResponsePackagePublic,
  PaginatedResponseRoomPublic,
} from '@generated/types.gen';

import type { ItemType, SessionType, Status } from '@generated/types.gen';

/**
 * Item Type Options for Select component
 */
export const ITEM_TYPE_OPTIONS = [
  { label: 'Fotografía Digital', value: 'Digital Photo' as ItemType },
  { label: 'Fotografía Impresa', value: 'Printed Photo' as ItemType },
  { label: 'Álbum', value: 'Album' as ItemType },
  { label: 'Video', value: 'Video' as ItemType },
  { label: 'Otro', value: 'Other' as ItemType },
];

/**
 * Session Type Options for Select component
 */
export const SESSION_TYPE_OPTIONS = [
  { label: 'Estudio', value: 'Studio' as SessionType },
  { label: 'Externo', value: 'External' as SessionType },
  { label: 'Ambos', value: 'Both' as SessionType },
];

/**
 * Get label for Item Type
 */
export function getItemTypeLabel(type: ItemType): string {
  const option = ITEM_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label ?? type;
}

/**
 * Get PrimeNG severity for Item Type tag
 */
export function getItemTypeSeverity(
  type: ItemType
): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
  const severityMap: Record<ItemType, 'success' | 'info' | 'warn' | 'secondary' | 'contrast'> = {
    'Digital Photo': 'info',
    'Printed Photo': 'success',
    Album: 'warn',
    Video: 'secondary',
    Other: 'contrast',
  };
  return severityMap[type] ?? null;
}

/**
 * Get status label
 */
export function getStatusLabel(status: Status): string {
  return status === 'Active' ? 'Activo' : 'Inactivo';
}

/**
 * Get PrimeNG severity for status tag
 */
export function getStatusSeverity(
  status: Status
): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
  return status === 'Active' ? 'success' : 'secondary';
}

/**
 * Room Status type (extends Status with Maintenance)
 */
export type RoomStatus = Status | 'Maintenance';

/**
 * Get room status label in Spanish
 */
export function getRoomStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    Active: 'Activo',
    Inactive: 'Inactivo',
    Maintenance: 'Mantenimiento',
  };
  return statusMap[status] ?? status;
}

/**
 * Get PrimeNG severity for room status tag
 */
export function getRoomStatusSeverity(
  status: string
): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
  const severityMap: Record<string, 'success' | 'secondary' | 'warn'> = {
    Active: 'success',
    Inactive: 'secondary',
    Maintenance: 'warn',
  };
  return severityMap[status] ?? null;
}

/**
 * Get label for Session Type
 */
export function getSessionTypeLabel(type: SessionType): string {
  const option = SESSION_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label ?? type;
}

/**
 * Get PrimeNG severity for Session Type tag
 */
export function getSessionTypeSeverity(
  type: SessionType
): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null {
  const severityMap: Record<SessionType, 'info' | 'success' | 'warn'> = {
    Studio: 'info',
    External: 'success',
    Both: 'warn',
  };
  return severityMap[type] ?? null;
}

/**
 * Filters state for catalog lists
 */
export interface CatalogFilters {
  search?: string;
  itemType?: ItemType | null;
  sessionType?: SessionType | null;
  activeOnly?: boolean;
  skip?: number;
  limit?: number;
}
