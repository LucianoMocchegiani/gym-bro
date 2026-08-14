/**
 * Waitlist API (módulo `waitlist`). Staff: `reservations.write`.
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type WaitlistStatus = 'WAITING' | 'PROMOTED' | 'LEFT';

export type WaitlistEntryDetail = {
  id: string;
  tenantId: string;
  sessionId: string;
  sessionStartsAt: string;
  sessionEndsAt: string;
  serviceId: string;
  serviceName: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  status: WaitlistStatus;
  position: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ListSessionWaitlistInput = {
  /** Default API: solo WAITING. */
  status?: WaitlistStatus;
  /** Histórico WAITING + PROMOTED + LEFT. */
  allStatuses?: boolean;
} & ListParams;

/**
 * Cola de lista de espera de una sesión.
 */
export function listSessionWaitlist(
  sessionId: string,
  input?: ListSessionWaitlistInput,
): Promise<ListResult<WaitlistEntryDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<WaitlistEntryDetail>>(
    `/sessions/${sessionId}/waitlist${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Alta en waitlist a nombre del afiliado (staff).
 */
export function joinWaitlistForMember(
  memberId: string,
  sessionId: string,
): Promise<WaitlistEntryDetail> {
  return apiRequest<WaitlistEntryDetail>(`/members/${memberId}/waitlist`, {
    method: 'POST',
    body: { sessionId },
  });
}

/**
 * Saca de la cola (WAITING → LEFT).
 */
export function leaveWaitlist(entryId: string): Promise<WaitlistEntryDetail> {
  return apiRequest<WaitlistEntryDetail>(`/waitlist/${entryId}/status`, {
    method: 'PATCH',
    body: { status: 'LEFT' },
  });
}
