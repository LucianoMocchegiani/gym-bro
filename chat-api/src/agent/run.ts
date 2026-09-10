import { streamText } from 'ai';
import { HTTPException } from 'hono/http-exception';
import { config } from '../config.js';
import { applyAutomaticTitle } from '../conversations/service.js';
import { isAbortError, staffFacingLlmError } from '../llm/errors.js';
import { chatModel } from '../llm/openrouter.js';
import { openMcpClient } from '../mcp/client.js';
import {
  insertAssistantMessage,
  insertToolMessage,
  insertUserMessage,
  listMessages,
  toJsonValue,
  touchConversation,
} from '../messages/persist.js';
import { buildModelMessages, shrinkToolContent } from './window.js';

type LooseTool = {
  toolName?: string;
  args?: unknown;
  input?: unknown;
  result?: unknown;
  output?: unknown;
};

type LooseStep = {
  text?: string;
  toolCalls?: LooseTool[];
  toolResults?: LooseTool[];
};

function pickTools(
  listed: Record<string, unknown>,
  allowlist: string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(listed)) {
    if (allowlist.some((name) => key === name || key.endsWith(`.${name}`))) {
      picked[key] = value;
    }
  }
  return picked;
}

function toolNameOf(item: LooseTool, fallback = 'tool'): string {
  return typeof item.toolName === 'string' && item.toolName.length > 0
    ? item.toolName
    : fallback;
}

function toolArgsOf(item: LooseTool): unknown {
  return item.input ?? item.args;
}

function toolOutputOf(item: LooseTool): unknown {
  return item.output ?? item.result;
}

function assistantTextOf(text: string | undefined, steps: LooseStep[]): string {
  if (text && text.trim()) {
    return text.trim();
  }
  return steps
    .map((step) => (typeof step.text === 'string' ? step.text.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function persistAgentTurn(
  conversationId: string,
  text: string,
  steps: LooseStep[],
): Promise<void> {
  for (const step of steps) {
    const calls = step.toolCalls ?? [];
    const results = step.toolResults ?? [];
    const n = Math.max(calls.length, results.length);
    for (let i = 0; i < n; i += 1) {
      const call = calls[i] ?? {};
      const result = results[i] ?? {};
      const name = toolNameOf(result, toolNameOf(call));
      const output = toolOutputOf(result);
      await insertToolMessage({
        conversationId,
        toolName: name,
        toolArgs: toJsonValue(toolArgsOf(call) ?? toolArgsOf(result)),
        toolResult: toJsonValue(output),
        content: shrinkToolContent(name, output, true),
      });
    }
  }
  const trimmed = text.trim();
  if (trimmed.length > 0) {
    await insertAssistantMessage(conversationId, trimmed);
  } else {
    await touchConversation(conversationId);
  }
}

/**
 * Corre un turno: MCP + OpenRouter + stream UI. Persiste user, tools y assistant.
 *
 * @remarks Abort del cliente (`AbortSignal`) corta el LLM y guarda lo ya generado.
 * @throws {HTTPException} 502 si MCP u OpenRouter no arrancan.
 */
export async function streamAgentTurn(
  conversationId: string,
  accessToken: string,
  userText: string,
  abortSignal?: AbortSignal,
  mode: 'staff' | 'public' = 'staff',
): Promise<Response> {
  const mcpFailMessage =
    mode === 'public'
      ? 'El asistente no está disponible.'
      : 'El asistente no puede consultar los datos del gym.';
  let mcp;
  try {
    mcp = await openMcpClient(accessToken);
  } catch (error) {
    console.error(error);
    throw new HTTPException(502, {
      message: mcpFailMessage,
    });
  }

  let tools;
  try {
    const listed = await mcp.tools();
    tools =
      mode === 'public'
        ? (pickTools(listed as Record<string, unknown>, ['get_help']) as typeof listed)
        : listed;
  } catch (error) {
    await mcp.close().catch(() => undefined);
    console.error(error);
    throw new HTTPException(502, {
      message: mcpFailMessage,
    });
  }

  await insertUserMessage(conversationId, userText);
  await applyAutomaticTitle(conversationId, userText);
  const history = await listMessages(conversationId);
  const messages = buildModelMessages(history);
  const system =
    mode === 'public' ? config.chatPublicSystemPrompt : config.chatSystemPrompt;

  let closed = false;
  const closeMcp = async () => {
    if (closed) {
      return;
    }
    closed = true;
    await mcp.close().catch(() => undefined);
  };

  let saved = false;
  const acc: LooseStep[] = [];
  const saveOnce = async (text: string | undefined, steps: unknown) => {
    if (saved) {
      await closeMcp();
      return;
    }
    saved = true;
    const loose = Array.isArray(steps) ? (steps as LooseStep[]) : acc;
    try {
      await persistAgentTurn(conversationId, assistantTextOf(text, loose), loose);
    } catch (error) {
      console.error(error);
    }
    await closeMcp();
  };

  try {
    const result = streamText({
      model: chatModel(),
      system,
      messages,
      tools,
      abortSignal,
      stopWhen: ({ steps }) => steps.length >= config.maxToolSteps,
      onStepFinish: (step) => {
        acc.push(step as LooseStep);
      },
      onFinish: async ({ text, steps }) => {
        await saveOnce(text, steps);
      },
      onAbort: async ({ steps }) => {
        const fromEvent = Array.isArray(steps) ? (steps as LooseStep[]) : [];
        await saveOnce(undefined, fromEvent.length > 0 ? fromEvent : acc);
      },
      onError: async (event) => {
        if (!isAbortError(event)) {
          console.error(event);
        }
        await saveOnce(undefined, acc);
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => staffFacingLlmError(error) || 'El proveedor de IA no está disponible. Reintentá en un momento.',
    });
  } catch (error) {
    await closeMcp();
    if (isAbortError(error)) {
      throw error;
    }
    console.error(error);
    throw new HTTPException(502, { message: staffFacingLlmError(error) });
  }
}
