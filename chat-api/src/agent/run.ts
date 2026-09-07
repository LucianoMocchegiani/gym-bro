import { streamText } from 'ai';
import { HTTPException } from 'hono/http-exception';
import { config } from '../config.js';
import { chatModel } from '../llm/openrouter.js';
import { openMcpClient } from '../mcp/client.js';
import {
  insertAssistantMessage,
  insertToolMessage,
  insertUserMessage,
  listMessages,
  toJsonValue,
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
  await insertAssistantMessage(conversationId, text.trim());
}

/**
 * Corre un turno: MCP + OpenRouter + stream UI. Persiste user, tools y assistant.
 *
 * @throws {HTTPException} 502 si MCP u OpenRouter no arrancan.
 */
export async function streamAgentTurn(
  conversationId: string,
  accessToken: string,
  userText: string,
): Promise<Response> {
  let mcp;
  try {
    mcp = await openMcpClient(accessToken);
  } catch (error) {
    console.error(error);
    throw new HTTPException(502, { message: 'MCP unavailable' });
  }

  let tools;
  try {
    tools = await mcp.tools();
  } catch (error) {
    await mcp.close().catch(() => undefined);
    console.error(error);
    throw new HTTPException(502, { message: 'MCP tools/list failed' });
  }

  await insertUserMessage(conversationId, userText);
  const history = await listMessages(conversationId);
  const messages = buildModelMessages(history);

  let closed = false;
  const closeMcp = async () => {
    if (closed) {
      return;
    }
    closed = true;
    await mcp.close().catch(() => undefined);
  };

  try {
    const result = streamText({
      model: chatModel(),
      system: config.chatSystemPrompt,
      messages,
      tools,
      stopWhen: ({ steps }) => steps.length >= config.maxToolSteps,
      onFinish: async ({ text, steps }) => {
        try {
          await persistAgentTurn(conversationId, text, steps as LooseStep[]);
        } catch (error) {
          console.error(error);
        }
        await closeMcp();
      },
      onError: async (event) => {
        console.error(event);
        await closeMcp();
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    await closeMcp();
    console.error(error);
    throw new HTTPException(502, { message: 'LLM unavailable' });
  }
}
