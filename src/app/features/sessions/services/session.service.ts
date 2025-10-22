import { inject, Injectable } from '@angular/core';
import {  HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  SessionPublic,
  SessionDetail,
  SessionCreate,
  SessionUpdate,
  PaginatedSessionsResponse,
  SessionListFilters,
  SessionStatusTransition,
  SessionCancellation,
  SessionEditorAssignment,
  SessionMarkReady,
  SessionDetailLineItem,
  SessionPhotographer,
  SessionPhotographerAssign,
  SessionPhotographerUpdate,
  SessionPayment,
  SessionPaymentCreate,
  SessionStatusHistory,
} from '../models/session.models';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/sessions`;

  // ==================== Session CRUD ====================

  /**
   * Create a new session in REQUEST status
   */
  createSession(data: SessionCreate): Observable<SessionPublic> {
    return this.http.post<SessionPublic>(this.apiUrl, data);
  }

  /**
   * Get session by ID with detailed information
   */
  getSession(sessionId: number): Observable<SessionDetail> {
    return this.http.get<SessionDetail>(`${this.apiUrl}/${sessionId}`);
  }

  /**
   * List sessions with pagination and filters
   */
  listSessions(filters: SessionListFilters = {}): Observable<PaginatedSessionsResponse> {
    let params = new HttpParams();

    if (filters.client_id) params = params.set('client_id', filters.client_id.toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.photographer_id) params = params.set('photographer_id', filters.photographer_id.toString());
    if (filters.editor_id) params = params.set('editor_id', filters.editor_id.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedSessionsResponse>(this.apiUrl, { params });
  }

  /**
   * List my assigned sessions (for photographers)
   */
  listMyAssignments(filters: SessionListFilters = {}): Observable<PaginatedSessionsResponse> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedSessionsResponse>(`${this.apiUrl}/my-assignments`, { params });
  }

  /**
   * List my editing assignments (for editors)
   */
  listMyEditing(filters: SessionListFilters = {}): Observable<PaginatedSessionsResponse> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<PaginatedSessionsResponse>(`${this.apiUrl}/my-editing`, { params });
  }

  /**
   * Update session information
   */
  updateSession(sessionId: number, data: SessionUpdate): Observable<SessionPublic> {
    return this.http.patch<SessionPublic>(`${this.apiUrl}/${sessionId}`, data);
  }

  // ==================== State Machine Transitions ====================

  /**
   * Transition session to a new status
   */
  transitionStatus(sessionId: number, data: SessionStatusTransition): Observable<SessionPublic> {
    return this.http.post<SessionPublic>(`${this.apiUrl}/${sessionId}/transition`, data);
  }

  /**
   * Cancel session with refund calculation
   */
  cancelSession(sessionId: number, data: SessionCancellation): Observable<SessionDetail> {
    return this.http.post<SessionDetail>(`${this.apiUrl}/${sessionId}/cancel`, data);
  }

  /**
   * Mark session as ready for delivery (editor completed)
   */
  markSessionReady(sessionId: number, data: SessionMarkReady): Observable<SessionPublic> {
    return this.http.post<SessionPublic>(`${this.apiUrl}/${sessionId}/mark-ready`, data);
  }

  /**
   * Assign editor to session
   */
  assignEditor(sessionId: number, data: SessionEditorAssignment): Observable<SessionPublic> {
    return this.http.post<SessionPublic>(`${this.apiUrl}/${sessionId}/assign-editor`, data);
  }

  // ==================== Session Details (Line Items) ====================

  /**
   * Add item to session
   */
  addItemToSession(sessionId: number, itemId: number, quantity: number = 1): Observable<SessionDetailLineItem> {
    const params = new HttpParams().set('quantity', quantity.toString());
    return this.http.post<SessionDetailLineItem>(
      `${this.apiUrl}/${sessionId}/details/items/${itemId}`,
      null,
      { params }
    );
  }

  /**
   * Add package to session (package explosion)
   */
  addPackageToSession(sessionId: number, packageId: number): Observable<SessionDetailLineItem[]> {
    return this.http.post<SessionDetailLineItem[]>(
      `${this.apiUrl}/${sessionId}/details/packages/${packageId}`,
      null
    );
  }

  /**
   * List all line items for a session
   */
  listSessionDetails(sessionId: number): Observable<SessionDetailLineItem[]> {
    return this.http.get<SessionDetailLineItem[]>(`${this.apiUrl}/${sessionId}/details`);
  }

  /**
   * Remove session detail line item
   */
  removeSessionDetail(sessionId: number, detailId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${sessionId}/details/${detailId}`);
  }

  /**
   * Recalculate session totals
   */
  recalculateSessionTotals(sessionId: number): Observable<SessionPublic> {
    return this.http.post<SessionPublic>(`${this.apiUrl}/${sessionId}/recalculate`, null);
  }

  // ==================== Session Photographers ====================

  /**
   * Assign photographer to session
   */
  assignPhotographer(sessionId: number, data: SessionPhotographerAssign): Observable<SessionPhotographer> {
    return this.http.post<SessionPhotographer>(`${this.apiUrl}/${sessionId}/photographers`, data);
  }

  /**
   * List photographer assignments for a session
   */
  listSessionPhotographers(sessionId: number): Observable<SessionPhotographer[]> {
    return this.http.get<SessionPhotographer[]>(`${this.apiUrl}/${sessionId}/photographers`);
  }

  /**
   * Mark photographer as attended
   */
  markPhotographerAttended(
    sessionId: number,
    assignmentId: number,
    data: SessionPhotographerUpdate
  ): Observable<SessionPhotographer> {
    return this.http.patch<SessionPhotographer>(
      `${this.apiUrl}/${sessionId}/photographers/${assignmentId}/attended`,
      data
    );
  }

  /**
   * Mark my attendance (simplified for photographers)
   */
  markMyAttendance(sessionId: number, data: SessionPhotographerUpdate): Observable<SessionPhotographer> {
    return this.http.patch<SessionPhotographer>(
      `${this.apiUrl}/${sessionId}/my-attendance`,
      data
    );
  }

  /**
   * Remove photographer assignment
   */
  removePhotographerAssignment(sessionId: number, assignmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${sessionId}/photographers/${assignmentId}`);
  }

  // ==================== Session Payments ====================

  /**
   * Record payment for a session
   */
  recordPayment(sessionId: number, data: SessionPaymentCreate): Observable<SessionPayment> {
    return this.http.post<SessionPayment>(`${this.apiUrl}/${sessionId}/payments`, data);
  }

  /**
   * List all payments for a session
   */
  listSessionPayments(sessionId: number): Observable<SessionPayment[]> {
    return this.http.get<SessionPayment[]>(`${this.apiUrl}/${sessionId}/payments`);
  }

  // ==================== Session Status History ====================

  /**
   * Get status change history for a session
   */
  getSessionStatusHistory(sessionId: number): Observable<SessionStatusHistory[]> {
    return this.http.get<SessionStatusHistory[]>(`${this.apiUrl}/${sessionId}/history`);
  }
}
