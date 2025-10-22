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
} from '@generated/types';

import type { ItemType, Status } from '@generated/types';

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
 * Filters state for catalog lists
 */
export interface CatalogFilters {
  search?: string;
  itemType?: ItemType | null;
  sessionType?: string | null;
  activeOnly?: boolean;
  skip?: number;
  limit?: number;
}
