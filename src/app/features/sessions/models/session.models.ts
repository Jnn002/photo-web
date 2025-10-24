/**
 * Session models for photography session management.
 *
 * Aligned with backend models in photography-studio-api/app/sessions/
 */

// ==================== Enums ====================

export enum SessionStatus {
  REQUEST = 'Request',
  NEGOTIATION = 'Negotiation',
  PRE_SCHEDULED = 'Pre-scheduled',
  CONFIRMED = 'Confirmed',
  ASSIGNED = 'Assigned',
  ATTENDED = 'Attended',
  IN_EDITING = 'In Editing',
  READY_FOR_DELIVERY = 'Ready for Delivery',
  COMPLETED = 'Completed',
  CANCELED = 'Canceled',
}

export enum SessionType {
  STUDIO = 'Studio',
  EXTERNAL = 'External',
  BOTH = 'Both',
}

export enum PaymentType {
  DEPOSIT = 'Deposit',
  BALANCE = 'Balance',
  PARTIAL = 'Partial',
  REFUND = 'Refund',
}

export enum PhotographerRole {
  LEAD = 'Lead',
  ASSISTANT = 'Assistant',
}

export enum LineType {
  ITEM = 'Item',
  PACKAGE = 'Package',
  CUSTOM = 'Custom',
}

export enum ReferenceType {
  ITEM = 'Item',
  PACKAGE = 'Package',
}

export enum DeliveryMethod {
  DIGITAL = 'Digital',
  PHYSICAL = 'Physical',
  BOTH = 'Both',
}

// ==================== Session Models ====================

export interface SessionPublic {
  id: number;
  client_id: number;
  session_type: SessionType;
  session_date: string; // ISO date
  session_time: string | null; // HH:MM format
  estimated_duration_hours: number | null;
  location: string | null;
  room_id: number | null;
  status: SessionStatus;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  paid_amount: number;
  payment_deadline: string | null; // ISO date
  changes_deadline: string | null; // ISO date
  delivery_deadline: string | null; // ISO date
  client_requirements: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface SessionDetail extends SessionPublic {
  editing_assigned_to: number | null;
  editing_started_at: string | null; // ISO datetime
  editing_completed_at: string | null; // ISO datetime
  delivery_method: DeliveryMethod | null;
  delivery_address: string | null;
  delivered_at: string | null; // ISO datetime
  internal_notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null; // ISO datetime
  cancelled_by: number | null;
}

export interface SessionCreate {
  client_id: number;
  session_type: SessionType;
  session_date: string; // ISO date
  session_time?: string | null; // HH:MM format
  estimated_duration_hours?: number | null;
  location?: string | null;
  room_id?: number | null;
  client_requirements?: string | null;
}

export interface SessionUpdate {
  session_date?: string | null; // ISO date
  session_time?: string | null; // HH:MM format
  estimated_duration_hours?: number | null;
  location?: string | null;
  room_id?: number | null;
  client_requirements?: string | null;
  internal_notes?: string | null;
  delivery_method?: DeliveryMethod | null;
  delivery_address?: string | null;
}

// ==================== Session Detail (Line Items) Models ====================

export interface SessionDetailLineItem {
  id: number;
  session_id: number;
  line_type: LineType;
  reference_id: number | null;
  reference_type: ReferenceType | null;
  item_code: string;
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  line_subtotal: number;
  is_delivered: boolean;
  delivered_at: string | null; // ISO datetime
  created_at: string; // ISO datetime
}

export interface SessionDetailCreate {
  line_type: LineType;
  reference_id?: number | null;
  reference_type?: ReferenceType | null;
  item_code: string;
  item_name: string;
  item_description?: string | null;
  quantity: number;
  unit_price: number;
}

// ==================== Session Photographer Models ====================

export interface SessionPhotographer {
  id: number;
  session_id: number;
  photographer_id: number;
  role: PhotographerRole | null;
  assigned_at: string; // ISO datetime
  assigned_by: number;
  attended: boolean;
  attended_at: string | null; // ISO datetime
  notes: string | null;
}

export interface SessionPhotographerAssign {
  session_id: number;
  photographer_id: number;
  role?: PhotographerRole | null;
}

export interface SessionPhotographerUpdate {
  attended: boolean;
  notes?: string | null;
}

// ==================== Session Payment Models ====================

export interface SessionPayment {
  id: number;
  session_id: number;
  payment_type: PaymentType;
  payment_method: string;
  amount: number;
  transaction_reference: string | null;
  payment_date: string; // ISO date
  notes: string | null;
  created_at: string; // ISO datetime
  created_by: number;
}

export interface SessionPaymentCreate {
  session_id: number;
  payment_type: PaymentType;
  payment_method: string;
  amount: number | string; // Backend expects Decimal (can be string)
  transaction_reference?: string | null;
  payment_date: string; // ISO date
  notes?: string | null;
}

// ==================== Session Status History Models ====================

export interface SessionStatusHistory {
  id: number;
  session_id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  notes: string | null;
  changed_at: string; // ISO datetime
  changed_by: number;
}

export interface SessionStatusHistoryCreate {
  session_id: number;
  from_status?: string | null;
  to_status: string;
  reason?: string | null;
  notes?: string | null;
}

// ==================== Session Action Models ====================

export interface SessionStatusTransition {
  to_status: string;
  reason?: string | null;
  notes?: string | null;
}

export interface SessionCancellation {
  cancellation_reason: string;
  initiated_by: 'Client' | 'Studio';
  notes?: string | null;
}

export interface SessionEditorAssignment {
  editor_id: number;
}

export interface SessionMarkReady {
  notes?: string | null;
}

export interface SessionDelivery {
  delivery_method: DeliveryMethod;
  delivery_address?: string | null;
  notes?: string | null;
}

// ==================== Helper Types ====================

/**
 * Paginated response wrapper
 */
export interface PaginatedSessionsResponse {
  items: SessionPublic[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Session list filters
 */
export interface SessionListFilters {
  client_id?: number | null;
  status?: SessionStatus | null;
  start_date?: string | null; // ISO date
  end_date?: string | null; // ISO date
  photographer_id?: number | null;
  editor_id?: number | null;
  limit?: number;
  offset?: number;
}

/**
 * Status badge configuration
 */
export interface SessionStatusBadge {
  label: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
}

/**
 * State machine transition configuration
 */
export interface StatusTransitionConfig {
  from: SessionStatus;
  to: SessionStatus[];
}

// ==================== Constants ====================

/**
 * Valid state transitions (mirrors backend VALID_TRANSITIONS)
 */
export const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SessionStatus.REQUEST]: [
    SessionStatus.NEGOTIATION,
    SessionStatus.PRE_SCHEDULED,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.NEGOTIATION]: [
    SessionStatus.PRE_SCHEDULED,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.PRE_SCHEDULED]: [
    SessionStatus.CONFIRMED,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.CONFIRMED]: [SessionStatus.ASSIGNED, SessionStatus.CANCELED],
  [SessionStatus.ASSIGNED]: [SessionStatus.ATTENDED, SessionStatus.CANCELED],
  [SessionStatus.ATTENDED]: [
    SessionStatus.IN_EDITING,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.IN_EDITING]: [
    SessionStatus.READY_FOR_DELIVERY,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.READY_FOR_DELIVERY]: [
    SessionStatus.COMPLETED,
    SessionStatus.CANCELED,
  ],
  [SessionStatus.COMPLETED]: [],
  [SessionStatus.CANCELED]: [],
};

/**
 * Status badge mappings for UI
 */
export const STATUS_BADGE_MAP: Record<SessionStatus, SessionStatusBadge> = {
  [SessionStatus.REQUEST]: { label: 'Solicitud', severity: 'secondary' },
  [SessionStatus.NEGOTIATION]: { label: 'Negociación', severity: 'warn' },
  [SessionStatus.PRE_SCHEDULED]: {
    label: 'Pre-agendada',
    severity: 'warn',
  },
  [SessionStatus.CONFIRMED]: { label: 'Confirmada', severity: 'info' },
  [SessionStatus.ASSIGNED]: { label: 'Asignada', severity: 'info' },
  [SessionStatus.ATTENDED]: { label: 'Atendida', severity: 'success' },
  [SessionStatus.IN_EDITING]: { label: 'En Edición', severity: 'info' },
  [SessionStatus.READY_FOR_DELIVERY]: {
    label: 'Lista para Entrega',
    severity: 'success',
  },
  [SessionStatus.COMPLETED]: { label: 'Completada', severity: 'success' },
  [SessionStatus.CANCELED]: { label: 'Cancelada', severity: 'danger' },
};

/**
 * Spanish labels for session types
 */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  [SessionType.STUDIO]: 'Estudio',
  [SessionType.EXTERNAL]: 'Externa',
  [SessionType.BOTH]: 'Ambos',
};

/**
 * Spanish labels for payment types
 */
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.DEPOSIT]: 'Depósito',
  [PaymentType.BALANCE]: 'Balance',
  [PaymentType.PARTIAL]: 'Parcial',
  [PaymentType.REFUND]: 'Reembolso',
};
