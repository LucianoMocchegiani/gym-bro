/**
 * Sessions API (módulo `sessions`).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type SessionStatus = 'PUBLISHED' | 'CANCELLED';

export type SessionDetail = {
  id: string;
  tenantId: string;
  serviceId: string;
  serviceName: string;
  branchId: string;
  branchName: string;
  instructorId: string | null;
  instructorName: string | null;
  recurrenceRuleId: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
};

/** Alias usado por caja / selects. */
export type SessionSummary = SessionDetail;

export type CreateSessionInput = {
  serviceId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

export type UpdateSessionInput = {
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  instructorId?: string | null;
  status?: 'CANCELLED';
};

export type ListSessionsInput = {
  serviceId?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
} & ListParams;

/**
 * Lista sesiones (`sessions.write`), paginado.
 */
export function listSessions(
  input?: ListSessionsInput,
): Promise<ListResult<SessionDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<SessionDetail>>(
    `/sessions${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Detalle de sesión.
 */
export function getSession(sessionId: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}`);
}

/**
 * Alta de sesión puntual (CU-SER-003).
 */
export function createSession(
  input: CreateSessionInput,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>('/sessions', {
    method: 'POST',
    body: input,
  });
}

/**
 * Edición / cancelación de sesión.
 */
export function updateSession(
  sessionId: string,
  input: UpdateSessionInput,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}`, {
    method: 'PATCH',
    body: input,
  });
}

/**
 * Ampliar cupo (CU-SER-005).
 */
export function expandSessionCapacity(
  sessionId: string,
  capacity: number,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/capacity`, {
    method: 'PATCH',
    body: { capacity },
  });
}

/**
 * Eliminación segura de sesión (409 `SESSION_HAS_RESERVATIONS` si tiene reservas).
 */
export function deleteSession(sessionId: string): Promise<{ deleted: true }> {
  return apiRequest<{ deleted: true }>(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
