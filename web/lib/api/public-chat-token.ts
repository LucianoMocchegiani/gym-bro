const RUNTIME_ANON_TOKEN = /^anon:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRuntimeAnonymousToken(token: string): boolean {
  return RUNTIME_ANON_TOKEN.test(token);
}

export function createRuntimeAnonymousToken(): string {
  return `anon:${globalThis.crypto.randomUUID()}`;
}
