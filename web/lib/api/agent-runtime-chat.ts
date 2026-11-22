import { refreshStaffAccess } from '@/lib/api/client';
import { clearStaffSession, readStaffSession } from '@/lib/auth/session';
import { findPendingProposalApproval } from './agent-runtime-approvals';
import type { ChatConversation, ChatMessage } from './chat';

export class AgentRuntimeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}

type RuntimeConversation = Omit<ChatConversation, 'tenantId'>;
type RuntimeMessage = ChatMessage;
type Page<T, Cursor = string> = { items?: T[]; hasMore?: boolean; nextCursor?: Cursor | null };

let accessTokenOverride: string | null = null;

export function setRuntimeAccessTokenOverride(token: string | null): void {
  accessTokenOverride = token;
}

export function agentRuntimeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AGENT_RUNTIME_URL?.trim());
}

function baseUrl(): string {
  const value = process.env.NEXT_PUBLIC_AGENT_RUNTIME_URL?.trim().replace(/\/$/, '');
  if (!value) throw new AgentRuntimeError(503, 'Agent Runtime no está configurado.');
  return value;
}

async function runtimeFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  const token = accessTokenOverride ?? readStaffSession()?.accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && !retried && !accessTokenOverride && (await refreshStaffAccess())) {
    return runtimeFetch(path, init, true);
  }
  if (response.status === 401 && !accessTokenOverride) clearStaffSession();
  return response;
}

async function runtimeJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await runtimeFetch(path, init);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null
      ? (body as { error?: unknown; message?: unknown }).error ??
        (body as { error?: unknown; message?: unknown }).message
      : null;
    throw new AgentRuntimeError(
      response.status,
      typeof detail === 'string' && detail.trim() ? detail : `Error HTTP ${response.status}`,
    );
  }
  return body as T;
}

function toConversation(row: RuntimeConversation): ChatConversation {
  const session = readStaffSession();
  return { ...row, tenantId: session?.tenantId ?? '' };
}

export async function listRuntimeConversations(): Promise<ChatConversation[]> {
  const items: RuntimeConversation[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '20' });
    if (cursor) query.set('cursor', cursor);
    const page = await runtimeJson<Page<RuntimeConversation>>(`/v1/conversations?${query}`);
    items.push(...(page.items ?? []));
    cursor = page.hasMore ? (typeof page.nextCursor === 'string' ? page.nextCursor : null) : null;
  } while (cursor);
  return items.map(toConversation);
}

export async function createRuntimeConversation(): Promise<ChatConversation> {
  return toConversation(await runtimeJson<RuntimeConversation>('/v1/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }));
}

export async function archiveRuntimeConversation(id: string): Promise<ChatConversation> {
  return toConversation(await runtimeJson<RuntimeConversation>(`/v1/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }));
}

export async function patchRuntimeConversation(
  id: string,
  patch: { title: string | null },
): Promise<ChatConversation> {
  return toConversation(await runtimeJson<RuntimeConversation>(`/v1/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }));
}

export async function listRuntimeMessages(id: string): Promise<ChatMessage[]> {
  const items: RuntimeMessage[] = [];
  let before: { createdAt: string; id: string } | null = null;
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (before) {
      query.set('beforeCreatedAt', before.createdAt);
      query.set('beforeId', before.id);
    }
    const page = await runtimeJson<Page<RuntimeMessage, { createdAt: string; id: string }>>(
      `/v1/conversations/${encodeURIComponent(id)}/messages?${query}`,
    );
    const rows = page.items ?? [];
    items.unshift(...rows);
    before = page.hasMore ? (page.nextCursor ?? null) : null;
  } while (before);
  return items;
}

export async function postRuntimeTurn(id: string, text: string, signal?: AbortSignal): Promise<Response> {
  const response = await runtimeFetch(`/v1/conversations/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) {
    const textBody = await response.text();
    let detail: unknown = null;
    try {
      detail = textBody ? (JSON.parse(textBody) as unknown) : null;
    } catch {
      detail = { message: textBody };
    }
    const message = typeof detail === 'object' && detail !== null
      ? (detail as { error?: unknown; message?: unknown }).error ??
        (detail as { error?: unknown; message?: unknown }).message
      : null;
    throw new AgentRuntimeError(
      response.status,
      typeof message === 'string' && message.trim() ? message : `Error HTTP ${response.status}`,
    );
  }
  if (!response.body) throw new AgentRuntimeError(502, 'El asistente no está disponible.');
  return response;
}

export async function resolveRuntimeProposal(
  conversationId: string,
  input: Record<string, unknown>,
): Promise<{ message: ChatMessage; output: unknown }> {
  if (input.decision !== 'confirm' && input.decision !== 'cancel') {
    throw new AgentRuntimeError(400, 'Decisión de propuesta inválida.');
  }
  const proposalId = typeof input.proposalId === 'string' ? input.proposalId : '';
  const pending = findPendingProposalApproval(
    await listRuntimeMessages(conversationId),
    proposalId,
    input.decision === 'confirm' ? 'confirm' : undefined,
  );
  if (!pending) {
    throw new AgentRuntimeError(409, 'No hay una confirmación pendiente para esta propuesta. Pedile al asistente que la genere nuevamente.');
  }
  // shortcut: declines the pending action and lets the GymBro proposal expire, improve when Runtime supports alternate user-approved arguments.
  await runtimeJson(`/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(pending.id)}/approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: input.decision === 'confirm' }),
  });
  const message = (await listRuntimeMessages(conversationId)).find((item) => item.id === pending.id);
  if (!message) throw new AgentRuntimeError(502, 'No se pudo recuperar el resultado de la acción.');
  const output = input.decision === 'cancel'
    ? { proposalId, status: 'cancelled', message: 'No se ejecutó; la propuesta vencerá automáticamente.', links: [] }
    : message.toolResult;
  return { message, output };
}
