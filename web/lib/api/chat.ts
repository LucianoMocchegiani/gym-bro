/**
 * Cliente HTTP+SSE hacia `NEXT_PUBLIC_CHAT_API_URL` (chat-api, no Nest).
 *
 * @remarks Reusa el JWT Staff y el refresh de `apiRequest`. 401 tras refresh
 * limpia la sesión. 403 = perfil no STAFF.
 */

import { refreshStaffAccess } from '@/lib/api/client';
import {
  clearStaffSession,
  readStaffSession,
} from '@/lib/auth/session';

export type ChatConversation = {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolName: string | null;
  createdAt: string;
};

export class ChatClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ChatClientError';
    this.status = status;
  }
}

function chatBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_CHAT_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    throw new ChatClientError(503, 'Chat no configurado (NEXT_PUBLIC_CHAT_API_URL)');
  }
  return base;
}

function staffBearer(): string | null {
  const session = readStaffSession();
  return session?.accessToken ? `Bearer ${session.accessToken}` : null;
}

function errorMessage(status: number, parsed: unknown, fallback: string): string {
  if (typeof parsed === 'object' && parsed !== null) {
    const rec = parsed as { error?: unknown; message?: unknown };
    if (typeof rec.error === 'string' && rec.error.trim()) {
      return rec.error;
    }
    if (typeof rec.message === 'string' && rec.message.trim()) {
      return rec.message;
    }
  }
  if (status === 403) {
    return 'No hay permiso para el asistente.';
  }
  if (status === 401) {
    return 'Sesión vencida. Volvé a entrar.';
  }
  if (status === 402) {
    return 'No tienes crédito suficiente para usar el asistente.';
  }
  if (status === 502) {
    return fallback.includes('OpenRouter') || fallback.includes('proveedor')
      ? fallback
      : 'El asistente no está disponible.';
  }
  return fallback;
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function chatFetch(
  path: string,
  init: RequestInit,
  retried = false,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  const bearer = staffBearer();
  if (bearer) {
    headers.set('Authorization', bearer);
  }

  const res = await fetch(`${chatBaseUrl()}${path}`, { ...init, headers });

  if (res.status === 401 && !retried) {
    const refreshed = await refreshStaffAccess();
    if (refreshed) {
      return chatFetch(path, init, true);
    }
    clearStaffSession();
  }

  return res;
}

async function chatJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await chatFetch(path, init);
  const parsed = await parseJsonBody(res);
  if (!res.ok) {
    throw new ChatClientError(
      res.status,
      errorMessage(res.status, parsed, `Error HTTP ${res.status}`),
    );
  }
  return parsed as T;
}

/**
 * Hilos activos del staff (más recientes primero).
 */
export async function listChatConversations(): Promise<ChatConversation[]> {
  const data = await chatJson<{ items: ChatConversation[] }>('/v1/conversations');
  return data.items ?? [];
}

/**
 * Alta de hilo vacío. El título lo pone el primer mensaje (C7).
 */
export async function createChatConversation(): Promise<ChatConversation> {
  return chatJson<ChatConversation>('/v1/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

/**
 * Archiva el hilo (soft-delete C2).
 */
export async function archiveChatConversation(
  id: string,
): Promise<ChatConversation> {
  return chatJson<ChatConversation>(`/v1/conversations/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Edita el título del hilo (`PATCH`). Cadena vacía = sin título.
 */
export async function patchChatConversation(
  id: string,
  patch: { title: string | null },
): Promise<ChatConversation> {
  return chatJson<ChatConversation>(`/v1/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

/**
 * Historial persistido (user / assistant / tool).
 */
export async function listChatMessages(id: string): Promise<ChatMessage[]> {
  const data = await chatJson<{ items: ChatMessage[] }>(
    `/v1/conversations/${id}/messages`,
  );
  return data.items ?? [];
}

export type ChatStreamHandlers = {
  onToolStart: (toolCallId: string, toolName: string) => void;
  onToolDone: (toolCallId: string, toolName: string) => void;
  onTextDelta: (delta: string) => void;
  onStreamError: (message: string) => void;
};

export function isChatAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * POST turno y consume UI Message Stream.
 *
 * @returns `'aborted'` si el staff cortó con Parar.
 */
export async function streamChatTurn(
  conversationId: string,
  text: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<'ok' | 'aborted'> {
  try {
    const res = await chatFetch(`/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ text }),
      signal,
    });

    if (!res.ok) {
      const parsed = await parseJsonBody(res);
      throw new ChatClientError(
        res.status,
        errorMessage(res.status, parsed, `Error HTTP ${res.status}`),
      );
    }

    if (!res.body) {
      throw new ChatClientError(502, 'El asistente no está disponible.');
    }

    await readUiMessageStream(res.body, handlers);
    return signal?.aborted ? 'aborted' : 'ok';
  } catch (error) {
    if (isChatAbortError(error) || signal?.aborted) {
      return 'aborted';
    }
    throw error;
  }
}

async function readUiMessageStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      dispatchSseBlock(part, handlers);
    }
  }
  if (buffer.trim()) {
    dispatchSseBlock(buffer, handlers);
  }
}

function dispatchSseBlock(block: string, handlers: ChatStreamHandlers): void {
  const lines = block.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') {
      continue;
    }
    let event: unknown;
    try {
      event = JSON.parse(payload) as unknown;
    } catch {
      continue;
    }
    applyStreamEvent(event, handlers);
  }
}

function applyStreamEvent(event: unknown, handlers: ChatStreamHandlers): void {
  if (typeof event !== 'object' || event === null) {
    return;
  }
  const rec = event as {
    type?: unknown;
    toolCallId?: unknown;
    toolName?: unknown;
    delta?: unknown;
    errorText?: unknown;
  };
  const type = typeof rec.type === 'string' ? rec.type : '';
  if (type === 'tool-input-start') {
    const id = typeof rec.toolCallId === 'string' ? rec.toolCallId : '';
    const name = typeof rec.toolName === 'string' ? rec.toolName : 'tool';
    if (id) {
      handlers.onToolStart(id, name);
    }
    return;
  }
  if (type === 'tool-output-available') {
    const id = typeof rec.toolCallId === 'string' ? rec.toolCallId : '';
    const name = typeof rec.toolName === 'string' ? rec.toolName : 'tool';
    if (id) {
      handlers.onToolDone(id, name);
    }
    return;
  }
  if (type === 'text-delta' && typeof rec.delta === 'string') {
    handlers.onTextDelta(rec.delta);
    return;
  }
  if (type === 'error') {
    const message =
      typeof rec.errorText === 'string' && rec.errorText.trim()
        ? rec.errorText
        : 'El proveedor de IA no está disponible. Reintentá en un momento.';
    handlers.onStreamError(message);
  }
}
