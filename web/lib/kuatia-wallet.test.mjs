import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { credentialOfferEndpoint } from './kuatia-wallet.ts';

const endpoint = 'https://issuer.kuatia.xyz/openid4vc-flow/issuer-a/offers/offer-1';

describe('credentialOfferEndpoint', () => {
  it('unwraps Kuatia credential-offer deep links', () => {
    assert.equal(
      credentialOfferEndpoint(`openid-credential-offer://?credential_offer_uri=${encodeURIComponent(endpoint)}`),
      endpoint,
    );
  });

  it('preserves a direct OID4VCI offer endpoint', () => {
    assert.equal(credentialOfferEndpoint(endpoint), endpoint);
  });

  it('rejects a credential-offer link without its endpoint', () => {
    assert.throws(() => credentialOfferEndpoint('openid-credential-offer://'));
  });
});
