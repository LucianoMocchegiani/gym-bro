/**
 * Access API (módulo `access`): OID4VP puerta + pase manual + historial.
 */

import { apiRequest } from '@/lib/api/client';

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
  credentialRef: string | null;
  result: 'ALLOWED' | 'DENIED';
  reasonCode: string;
  scanMode: string;
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

/**
 * Historial de intentos (CU-ACC-005). Incluye nombre del afiliado.
 */
export function listAccessAttempts(input?: {
  limit?: number;
  result?: 'ALLOWED' | 'DENIED';
  from?: string;
  to?: string;
}): Promise<AccessAttemptDetail[]> {
  const params = new URLSearchParams();
  params.set('limit', String(input?.limit ?? 50));
  if (input?.result) {
    params.set('result', input.result);
  }
  if (input?.from) {
    params.set('from', input.from);
  }
  if (input?.to) {
    params.set('to', input.to);
  }
  return apiRequest<AccessAttemptDetail[]>(
    `/access-attempts?${params.toString()}`,
  );
}
