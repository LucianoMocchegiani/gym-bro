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
 * Re-emite el offer OID4VCI de un pack que cubre hoy (`members.write`).
 *
 * @remarks Sin `packId`, el contrato vigente más reciente. No cobra.
 */
export function reissueMemberCredentialOffer(
  memberId: string,
  force = true,
  packId?: string,
): Promise<CredentialOfferItem> {
  return apiRequest<CredentialOfferItem>(
    `/members/${memberId}/credential-offers`,
    {
      method: 'POST',
      body: packId ? { force, packId } : { force },
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
