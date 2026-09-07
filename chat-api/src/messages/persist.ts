import type { Message, Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export type MessageDto = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolName: string | null;
  toolArgs: Prisma.JsonValue | null;
  toolResult: Prisma.JsonValue | null;
  createdAt: string;
};

export function toMessageDto(row: Message): MessageDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    toolName: row.toolName,
    toolArgs: row.toolArgs,
    toolResult: row.toolResult,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
}

export async function insertUserMessage(
  conversationId: string,
  content: string,
): Promise<Message> {
  const row = await prisma.message.create({
    data: { conversationId, role: 'user', content },
  });
  await touchConversation(conversationId);
  return row;
}

export async function insertToolMessage(input: {
  conversationId: string;
  toolName: string;
  toolArgs: Prisma.InputJsonValue | undefined;
  toolResult: Prisma.InputJsonValue | undefined;
  content: string;
}): Promise<void> {
  await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: 'tool',
      content: input.content,
      toolName: input.toolName,
      toolArgs: input.toolArgs,
      toolResult: input.toolResult,
    },
  });
}

export async function insertAssistantMessage(
  conversationId: string,
  content: string,
): Promise<void> {
  await prisma.message.create({
    data: { conversationId, role: 'assistant', content },
  });
  await touchConversation(conversationId);
}

export async function touchConversation(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    JSON.stringify(value);
    return value as Prisma.InputJsonValue;
  } catch {
    return JSON.stringify(String(value));
  }
}
