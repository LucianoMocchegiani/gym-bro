import { ChatClientError, createChatConversation, setChatAccessTokenOverride, type ChatConversation } from '@/lib/api/chat';
import { createRuntimeAnonymousToken, isRuntimeAnonymousToken } from '@/lib/api/public-chat-token';

const TOKEN_KEY = 'faciliter.publicChat.token';
const CONVERSATION_KEY = 'faciliter.publicChat.conversationId';

type PublicSession = {
  token: string;
  conversation: ChatConversation;
};

function readStoredSession(): { token: string; conversationId: string } | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(TOKEN_KEY)?.trim();
  const conversationId = window.localStorage.getItem(CONVERSATION_KEY)?.trim();
  return token && conversationId ? { token, conversationId } : null;
}

function writeStoredSession(token: string, conversationId: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(CONVERSATION_KEY, conversationId);
}

function clearStoredSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(CONVERSATION_KEY);
}

function restoredSession(token: string, conversationId: string): PublicSession {
  return {
    token,
    conversation: {
      id: conversationId,
      tenantId: 'public',
      userId: token.slice('anon:'.length),
      title: null,
      archivedAt: null,
      createdAt: '',
      updatedAt: '',
    },
  };
}

/** Reusa la sesión anónima local o crea una nueva en Agent Runtime. */
export async function ensurePublicChatSession(): Promise<PublicSession> {
  const stored = readStoredSession();
  if (stored && isRuntimeAnonymousToken(stored.token)) {
    setChatAccessTokenOverride(stored.token);
    return restoredSession(stored.token, stored.conversationId);
  }

  const token = createRuntimeAnonymousToken();
  setChatAccessTokenOverride(token);
  try {
    const conversation = await createChatConversation();
    writeStoredSession(token, conversation.id);
    return {
      token,
      conversation: { ...conversation, tenantId: 'public', userId: token.slice('anon:'.length) },
    };
  } catch (error) {
    setChatAccessTokenOverride(null);
    throw error;
  }
}

export function resetPublicChatSession(): void {
  clearStoredSession();
  setChatAccessTokenOverride(null);
}
