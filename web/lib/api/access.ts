import { apiRequest } from '@/lib/api/client';
import type {
  AccessAttemptDetail,
  AccessScanMode,
  AccessVerifyResult,
  ManualPassMotive,
} from '@/lib/api/types';

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
 * Historial reciente de intentos (CU-ACC-005).
 */
export function listAccessAttempts(limit = 20): Promise<AccessAttemptDetail[]> {
  return apiRequest<AccessAttemptDetail[]>(
    `/access-attempts?limit=${limit}`,
  );
}
