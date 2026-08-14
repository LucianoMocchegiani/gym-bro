/**
 * Audit events API (módulo `audit`, CU-ROL-007).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type AuditActorProfile = 'SUPER' | 'STAFF' | 'MEMBER';

export type AuditEventDetail = {
  id: string;
  tenantId: string | null;
  actorProfile: AuditActorProfile;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export type ListAuditEventsInput = {
  /** Filtro exacto de action (si se usa, gana sobre `q`). */
  action?: string;
} & ListParams;

/**
 * Lista eventos de auditoría del tenant (`audit.read`).
 */
export function listAuditEvents(
  input?: ListAuditEventsInput,
): Promise<ListResult<AuditEventDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<AuditEventDetail>>(
    `/audit-events${qs ? `?${qs}` : ''}`,
  );
}
