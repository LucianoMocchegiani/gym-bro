const PREFIX = 'gymbro.staff.chat.lastId';

function storageKey(tenantId: string, userId: string): string {
  return `${PREFIX}:${tenantId}:${userId}`;
}

/**
 * Último hilo abierto por este staff en este gym (C5).
 */
export function readLastConversationId(
  tenantId: string,
  userId: string,
): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(storageKey(tenantId, userId));
}

export function writeLastConversationId(
  tenantId: string,
  userId: string,
  conversationId: string,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(storageKey(tenantId, userId), conversationId);
}

export function clearLastConversationId(tenantId: string, userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(storageKey(tenantId, userId));
}
