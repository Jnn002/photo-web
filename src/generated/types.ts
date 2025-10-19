// Temporary types until OpenAPI generation is fixed in backend
// TODO: Regenerate with: pnpm run generate:api

// Auth types
export interface UserLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserPublic;
}

// Role and Permission types
export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  module: string;
  status: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  status: string;
  permissions?: Permission[];
}

// User types
export interface UserPublic {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles: Role[];
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string | null;
  role_ids?: number[];
}

export interface UserUpdate {
  email?: string;
  full_name?: string | null;
  is_active?: boolean;
  role_ids?: number[];
}

// Client types
export interface ClientPublic {
  id: number;
  full_name: string;
  email: string | null;
  primary_phone: string;
  secondary_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  client_type: string;
  is_active: boolean;
}

// Session types
export type SessionStatus =
  | 'Request'
  | 'Negotiation'
  | 'Pre-scheduled'
  | 'Confirmed'
  | 'Assigned'
  | 'Attended'
  | 'In Editing'
  | 'Ready for Delivery'
  | 'Completed'
  | 'Canceled';

export type SessionType = 'Studio' | 'External';

export interface SessionPublic {
  id: number;
  client_id: number;
  session_type: SessionType;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status: SessionStatus;
  subtotal: string;
  transportation_cost: string;
  discount: string;
  total: string;
  deposit_percentage: number;
  deposit_amount: string;
  is_active: boolean;
  client?: ClientPublic;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
