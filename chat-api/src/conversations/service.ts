import type { Conversation } from '@prisma/client';
import { HTTPException } from 'hono/http-exception';
import { prisma } from '../prisma.js';
import type { Principal } from '../auth/principal.js';

const TITLE_MAX = 200;
const LIST_TAKE = 100;

export type ConversationDto = {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toConversationDto(row: Conversation): ConversationDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    title: row.title,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function ownerWhere(principal: Principal) {
  return { tenantId: principal.tenantId, userId: principal.userId };
}

/**
 * Lista hilos del principal, más recientes primero.
 *
 * @param archived Si true, solo archivados; si false, solo activos.
 */
export async function listConversations(
  principal: Principal,
  archived: boolean,
): Promise<ConversationDto[]> {
  const rows = await prisma.conversation.findMany({
    where: {
      ...ownerWhere(principal),
      archivedAt: archived ? { not: null } : null,
    },
    orderBy: { updatedAt: 'desc' },
    take: LIST_TAKE,
  });
  return rows.map(toConversationDto);
}

/**
 * Alta de hilo vacío. `tenantId`/`userId` salen del principal.
 */
export async function createConversation(
  principal: Principal,
  title: string | null,
): Promise<ConversationDto> {
  const row = await prisma.conversation.create({
    data: {
      tenantId: principal.tenantId,
      userId: principal.userId,
      title,
    },
  });
  return toConversationDto(row);
}

export async function getConversation(
  principal: Principal,
  id: string,
): Promise<ConversationDto> {
  const row = await prisma.conversation.findFirst({
    where: { id, ...ownerWhere(principal) },
  });
  if (!row) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }
  return toConversationDto(row);
}

export async function updateConversation(
  principal: Principal,
  id: string,
  patch: { title?: string | null; archived?: boolean },
): Promise<ConversationDto> {
  if (patch.title === undefined && patch.archived === undefined) {
    return getConversation(principal, id);
  }

  const data: {
    title?: string | null;
    archivedAt?: Date | null;
  } = {};
  if (patch.title !== undefined) {
    data.title = patch.title;
  }
  if (patch.archived === true) {
    data.archivedAt = new Date();
  } else if (patch.archived === false) {
    data.archivedAt = null;
  }

  const result = await prisma.conversation.updateMany({
    where: { id, ...ownerWhere(principal) },
    data,
  });
  if (result.count === 0) {
    throw new HTTPException(404, { message: 'Conversation not found' });
  }
  return getConversation(principal, id);
}

/**
 * Archivo lógico (`archived_at`). Idempotente.
 */
export async function archiveConversation(
  principal: Principal,
  id: string,
): Promise<ConversationDto> {
  return updateConversation(principal, id, { archived: true });
}

export function parseTitleInput(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new HTTPException(400, { message: 'title must be a string' });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > TITLE_MAX) {
    throw new HTTPException(400, { message: `title max ${TITLE_MAX} chars` });
  }
  return trimmed;
}
