import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  credentialOfferEndpoint,
  presentationWalletLink,
} from './kuatia-wallet.ts';

const endpoint = 'https://issuer.kuatia.xyz/openid4vc-flow/issuer-a/offers/offer-1';

describe('credentialOfferEndpoint', () => {
  it('unwraps Kuatia credential-offer deep links', () => {
    assert.equal(
      credentialOfferEndpoint(
        `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(endpoint)}`,
      ),
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

describe('presentationWalletLink', () => {
  it('wraps a Kuatia request URI with its verifier client_id', () => {
    const requestUri =
      'https://verifier.kuatia.xyz/openid4vc-flow/tenant-1/authorize/request-1';
    const link = new URL(presentationWalletLink(requestUri));
    assert.equal(link.origin + link.pathname, 'https://wallet.kuatia.xyz/present');
    assert.equal(
      link.searchParams.get('client_id'),
      'did:web:verifier.kuatia.xyz:tenant-1',
    );
    assert.equal(link.searchParams.get('request_uri'), requestUri);
  });

  it('rejects request URIs outside Kuatia verifier endpoints', () => {
    assert.throws(() => presentationWalletLink('https://example.com/request'));
    assert.throws(() =>
      presentationWalletLink('https://verifier.kuatia.xyz/other/request'),
    );
  });
});
