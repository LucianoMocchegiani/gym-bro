import crypto from 'crypto';

const STATE_TTL_MS = 120_000; // 2 min

const stateStore = new Map<string, { returnTo: string; expiresAt: number }>();

export function generateState(returnTo: string): string {
  const raw = `${returnTo}:${Date.now()}:${crypto.randomBytes(32).toString('hex')}`;
  const state = crypto.createHash('sha256').update(raw).digest('hex');
  stateStore.set(state, { returnTo, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

export function verifyState(state: string): { valid: boolean; returnTo: string } {
  const entry = stateStore.get(state);
  if (!entry) return { valid: false, returnTo: '' };
  if (Date.now() > entry.expiresAt) {
    stateStore.delete(state);
    return { valid: false, returnTo: '' };
  }
  stateStore.delete(state);
  return { valid: true, returnTo: entry.returnTo };
}