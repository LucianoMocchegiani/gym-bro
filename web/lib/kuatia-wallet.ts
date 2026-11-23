export function credentialOfferEndpoint(offerUri: string): string {
  let offer: URL
  try {
    offer = new URL(offerUri)
  } catch {
    throw new Error('La oferta de credencial no es una URL válida.')
  }

  if (offer.protocol !== 'openid-credential-offer:') return offerUri

  const endpoint = offer.searchParams.get('credential_offer_uri')
  if (!endpoint) throw new Error('La oferta no contiene credential_offer_uri.')
  return endpoint
}
