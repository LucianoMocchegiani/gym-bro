/**
 * Access API (módulo `access`): sistema de puerta, OID4VP, pase manual,
 * historial y vínculos ZKTeco.
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type ManualPassMotive =
  | 'deuda'
  | 'olvido_celular'
  | 'cortesia'
  | 'otro';

export type AccessAttemptDetail = {
  id: string;
  tenantId: string;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  subjectStaffId: string | null;
  subjectStaffName: string | null;
  subjectStaffEmail: string | null;
  credentialRef: string | null;
  result: 'ALLOWED' | 'DENIED';
  reasonCode: string;
  scanMode: string;
  channel: string;
  reservationId: string | null;
  sessionId: string | null;
  manualPass: boolean;
  motiveCode: string | null;
  note: string | null;
  actorStaffId: string | null;
  createdAt: string;
};

export type AccessVerifyResult = {
  allowed: boolean;
  reasonCode: string;
  memberId: string | null;
  subjectStaffId: string | null;
  reservationId: string | null;
  sessionId: string | null;
  checkedInAt: string | null;
  attempt: AccessAttemptDetail;
};

export type AccessOid4VpRequestResult = {
  requestUri: string;
  verificationSessionId: string;
  scanMode: 'member_scans_gym';
};

export type AccessProvider = 'KUATIA' | 'ZKTECO';

export type AccessDoorConfig = {
  provider: AccessProvider;
};

export type AccessIdentityLink = {
  id: string;
  provider: AccessProvider;
  externalId: string;
  memberId: string | null;
  staffUserId: string | null;
  createdAt: string;
};

export type AccessLinkSubject =
  | { kind: 'member'; id: string }
  | { kind: 'staff'; id: string };

/**
 * Sistema de puerta del gym (RN-ACC-010); legible por cualquier staff.
 */
export function getAccessDoor(): Promise<AccessDoorConfig> {
  return apiRequest<AccessDoorConfig>('/access/door');
}

function accessLinksPath(subject: AccessLinkSubject): string {
  const base = subject.kind === 'member' ? 'members' : 'staff';
  return `/${base}/${encodeURIComponent(subject.id)}/access-links`;
}

/**
 * Números del aparato vinculados a un socio o staff (RN-ACC-011).
 */
export function listAccessLinks(
  subject: AccessLinkSubject,
): Promise<AccessIdentityLink[]> {
  return apiRequest<AccessIdentityLink[]>(accessLinksPath(subject));
}

export function createAccessLink(
  subject: AccessLinkSubject,
  externalId: string,
): Promise<AccessIdentityLink> {
  return apiRequest<AccessIdentityLink>(accessLinksPath(subject), {
    method: 'POST',
    body: { externalId },
  });
}

export function deleteAccessLink(
  subject: AccessLinkSubject,
  linkId: string,
): Promise<void> {
  return apiRequest<void>(
    `${accessLinksPath(subject)}/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
  );
}

export type AccessOid4VpSessionResult =
  | { status: 'pending'; state: string }
  | { status: 'done'; state: string; result: AccessVerifyResult }
  | { status: 'error'; state: string; reasonCode: string };

/**
 * Crea request OID4VP para el QR de puerta (CU-ACC-001).
 */
export function createOid4VpRequest(): Promise<AccessOid4VpRequestResult> {
  return apiRequest<AccessOid4VpRequestResult>('/access/oid4vp/request', {
    method: 'POST',
  });
}

/**
 * Poll de sesión OID4VP; al `done` incluye evaluate.
 */
export function getOid4VpSession(
  verificationSessionId: string,
): Promise<AccessOid4VpSessionResult> {
  return apiRequest<AccessOid4VpSessionResult>(
    `/access/oid4vp/session/${encodeURIComponent(verificationSessionId)}`,
  );
}

/**
 * Pase manual (CU-ACC-004 / RN-ACC-006).
 */
export function manualPass(
  memberId: string,
  input: {
    motiveCode: ManualPassMotive;
    note?: string;
    sessionId?: string;
  },
): Promise<AccessVerifyResult> {
  return apiRequest<AccessVerifyResult>(
    `/members/${memberId}/access/manual-pass`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export type ListAccessAttemptsInput = {
  result?: 'ALLOWED' | 'DENIED';
  from?: string;
  to?: string;
} & ListParams;

/**
 * Historial de intentos (CU-ACC-005), paginado. Incluye nombre del afiliado.
 */
export function listAccessAttempts(
  input?: ListAccessAttemptsInput,
): Promise<ListResult<AccessAttemptDetail>> {
  const qs = toSearchParams({ pageSize: 50, ...input });
  return apiRequest<ListResult<AccessAttemptDetail>>(
    `/access-attempts${qs ? `?${qs}` : ''}`,
  );
}
