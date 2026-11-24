export function credentialOfferEndpoint(offerUri: string): string {
  let offer: URL;
  try {
    offer = new URL(offerUri);
  } catch {
    throw new Error('La oferta de credencial no es una URL válida.');
  }

  if (offer.protocol !== 'openid-credential-offer:') return offerUri;

  const endpoint = offer.searchParams.get('credential_offer_uri');
  if (!endpoint) throw new Error('La oferta no contiene credential_offer_uri.');
  return endpoint;
}

export function presentationWalletLink(requestUri: string): string {
  let request: URL;
  try {
    request = new URL(requestUri);
  } catch {
    throw new Error('La solicitud de presentación no es una URL válida.');
  }

  const match = /^\/openid4vc-flow\/([^/]+)\/(?:authorize|authorization-requests)\/[^/]+\/?$/.exec(
    request.pathname,
  );
  if (
    request.origin !== 'https://verifier.kuatia.xyz' ||
    request.username ||
    request.password ||
    request.hash ||
    !match ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(match[1])
  ) {
    throw new Error('La solicitud no pertenece a un verifier de Kuatia válido.');
  }

  const wallet = new URL('https://wallet.kuatia.xyz/present');
  wallet.searchParams.set(
    'client_id',
    `did:web:verifier.kuatia.xyz:${match[1]}`,
  );
  wallet.searchParams.set('request_uri', request.href);
  return wallet.toString();
}
