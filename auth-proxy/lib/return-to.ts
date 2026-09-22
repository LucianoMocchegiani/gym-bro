function isReturnToAllowed(returnTo: string, allowedDomains: string[]): boolean {
  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return false;
  }
  if (url.hostname === 'localhost') {
    return true;
  }
  for (const domain of allowedDomains) {
    if (url.hostname === domain || url.hostname.endsWith('.' + domain)) {
      return true;
    }
  }
  return false;
}

const ALLOWED_FQDNS = (process.env.RETURN_TO_ALLOWED_FQDNS ?? 'faciliter.xyz')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function validateReturnTo(returnTo: string): boolean {
  if (!returnTo) return false;
  try {
    const url = new URL(returnTo);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    return isReturnToAllowed(returnTo, ALLOWED_FQDNS);
  } catch {
    return false;
  }
}