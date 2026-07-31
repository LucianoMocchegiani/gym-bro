/**
 * Access API (módulo `access`).
 */

import { apiRequest } from '@/lib/api/client';

export type AccessScanMode = 'gym_scans_member' | 'member_scans_gym';

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

/**
 * Verifica ingreso en puerta (CU-ACC-001).
 */
export function verifyAccess(input: {
  mode: AccessScanMode;
  presentationToken?: string;
  venueToken?: string;
  credentialRef?: string;
}): Promise<AccessVerifyResult> {
  return apiRequest<AccessVerifyResult>('/access/verify', {
    method: 'POST',
    body: input,
  });
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
