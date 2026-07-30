/**
 * Sessions API (módulo `sessions`).
 */

import { apiRequest } from '@/lib/api/client';

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
  status?: 'CANCELLED';
};

/**
 * Lista sesiones (`sessions.write`).
 */
export function listSessions(input?: {
  serviceId?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
}): Promise<SessionDetail[]> {
  const params = new URLSearchParams();
  if (input?.serviceId) {
    params.set('serviceId', input.serviceId);
  }
  if (input?.from) {
    params.set('from', input.from);
  }
  if (input?.to) {
    params.set('to', input.to);
  }
  if (input?.status) {
    params.set('status', input.status);
  }
  const q = params.toString();
  return apiRequest<SessionDetail[]>(`/sessions${q ? `?${q}` : ''}`);
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
