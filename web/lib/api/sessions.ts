/**
 * Sessions API (módulo `sessions`).
 */

import { apiRequest } from '@/lib/api/client';

export type SessionStatus = 'PUBLISHED' | 'CANCELLED';

export type SessionSummary = {
  id: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: SessionStatus;
};

/**
 * Lista sesiones (`sessions.write`).
 */
export function listSessions(input?: {
  from?: string;
  to?: string;
  status?: SessionStatus;
}): Promise<SessionSummary[]> {
  const params = new URLSearchParams();
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
  return apiRequest<SessionSummary[]>(`/sessions${q ? `?${q}` : ''}`);
}
