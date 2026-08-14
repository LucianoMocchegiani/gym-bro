/**
 * Credential offers OID4VCI (módulo Kuatia).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type CredentialOfferStatus = 'PENDING' | 'FAILED' | 'ACCEPTED';

export type CredentialOfferItem = {
  id: string;
  status: CredentialOfferStatus;
  packId: string;
  packName: string;
  contractId: string;
  offerUri: string | null;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  /** Solo listado staff. */
  lastError?: string | null;
};

/**
 * Offers OID4VCI de un afiliado (`members.read`).
 */
export function listMemberCredentialOffers(
  memberId: string,
  input?: ListParams,
): Promise<ListResult<CredentialOfferItem>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<CredentialOfferItem>>(
    `/members/${memberId}/credential-offers${qs ? `?${qs}` : ''}`,
  );
}
