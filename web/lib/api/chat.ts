import {
  AgentRuntimeError,
  archiveRuntimeConversation,
  createRuntimeConversation,
  listRuntimeConversations,
  listRuntimeMessages,
  patchRuntimeConversation,
  postRuntimeTurn,
  resolveRuntimeProposal,
  setRuntimeAccessTokenOverride,
} from '@/lib/api/agent-runtime-chat';

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
  toolArgs?: unknown;
  toolResult?: unknown;
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

/** Bearer de la landing (sesión anónima). `null` vuelve al JWT Staff. */
export function setChatAccessTokenOverride(token: string | null): void {
  setRuntimeAccessTokenOverride(token);
}

async function runtimeCall<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof AgentRuntimeError) {
      throw new ChatClientError(error.status, error.message);
    }
    throw error;
  }
}

/** Hilos activos (más recientes primero). */
export async function listChatConversations(): Promise<ChatConversation[]> {
  return runtimeCall(listRuntimeConversations());
}

/** Alta de hilo vacío. El título lo pone el primer mensaje. */
export async function createChatConversation(): Promise<ChatConversation> {
  return runtimeCall(createRuntimeConversation());
}

/** Archiva el hilo sin borrar sus mensajes. */
export async function archiveChatConversation(id: string): Promise<ChatConversation> {
  return runtimeCall(archiveRuntimeConversation(id));
}

/** Edita el título del hilo. */
export async function patchChatConversation(
  id: string,
  patch: { title: string | null },
): Promise<ChatConversation> {
  return runtimeCall(patchRuntimeConversation(id, patch));
}

/** Historial persistido (user / assistant / tool). */
export async function listChatMessages(id: string): Promise<ChatMessage[]> {
  return runtimeCall(listRuntimeMessages(id));
}

/** Acción del usuario sobre una tarjeta Confirmar / Cancelar. */
export async function runChatUserAction(
  conversationId: string,
  tool: string,
  input: Record<string, unknown>,
): Promise<{ message: ChatMessage; output: unknown }> {
  if (tool !== 'confirm_proposal' && !tool.endsWith('__confirm_proposal')) {
    throw new ChatClientError(400, 'Acción de propuesta inválida.');
  }
  return runtimeCall(resolveRuntimeProposal(conversationId, input));
}

export type ChatStreamHandlers = {
  onToolStart: (toolCallId: string, toolName: string) => void;
  onToolDone: (toolCallId: string, toolName: string, output?: unknown) => void;
  onTextDelta: (delta: string) => void;
  onStreamError: (message: string) => void;
};

export function isChatAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/** POST turno y consume UI Message Stream. */
export async function streamChatTurn(
  conversationId: string,
  text: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<'ok' | 'aborted'> {
  try {
    const response = await runtimeCall(postRuntimeTurn(conversationId, text, signal));
    if (!response.body) throw new ChatClientError(502, 'El asistente no está disponible.');
    await consumeUiMessageStream(response.body, handlers);
    return signal?.aborted ? 'aborted' : 'ok';
  } catch (error) {
    if (isChatAbortError(error) || signal?.aborted) return 'aborted';
    throw error;
  }
}

export async function consumeUiMessageStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) dispatchSseBlock(part, handlers);
  }
  if (buffer.trim()) dispatchSseBlock(buffer, handlers);
}

function dispatchSseBlock(block: string, handlers: ChatStreamHandlers): void {
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
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
  if (typeof event !== 'object' || event === null) return;
  const rec = event as {
    type?: unknown;
    toolCallId?: unknown;
    toolName?: unknown;
    delta?: unknown;
    errorText?: unknown;
    output?: unknown;
    result?: unknown;
  };
  const type = typeof rec.type === 'string' ? rec.type : '';
  if (type === 'tool-input-start') {
    const id = typeof rec.toolCallId === 'string' ? rec.toolCallId : '';
    const name = typeof rec.toolName === 'string' ? rec.toolName : 'tool';
    if (id) handlers.onToolStart(id, name);
    return;
  }
  if (type === 'tool-output-available') {
    const id = typeof rec.toolCallId === 'string' ? rec.toolCallId : '';
    const name = typeof rec.toolName === 'string' ? rec.toolName : 'tool';
    if (id) handlers.onToolDone(id, name, rec.output ?? rec.result);
    return;
  }
  if (type === 'text-delta' && typeof rec.delta === 'string') {
    handlers.onTextDelta(rec.delta);
    return;
  }
  if (type === 'error') {
    handlers.onStreamError(
      typeof rec.errorText === 'string' && rec.errorText.trim()
        ? rec.errorText
        : 'El proveedor de IA no está disponible. Reintentá en un momento.',
    );
  }
}
