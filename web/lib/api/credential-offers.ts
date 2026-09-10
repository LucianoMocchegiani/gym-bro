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
 * Re-emite el offer OID4VCI del pack vigente hoy (`members.write`).
 *
 * @remarks No crea contrato ni cobro. Soft-fail Kuatia.
 */
export function reissueMemberCredentialOffer(
  memberId: string,
  force = true,
): Promise<CredentialOfferItem> {
  return apiRequest<CredentialOfferItem>(
    `/members/${memberId}/credential-offers`,
    {
      method: 'POST',
      body: { force },
    },
  );
}

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
