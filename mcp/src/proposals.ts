import { createHash, randomUUID } from 'node:crypto';
import type { GymbroWriteMethod } from './gymbro-client.js';
import type { NavLink } from './slim.js';

/** Vida de una propuesta sin confirmar (RN-ASI-001). */
export const PROPOSAL_TTL_MS = 120_000;

/** Tool que confirma o cancela; el chat no se la muestra al modelo (`_meta`). */
export const CONFIRM_TOOL = 'confirm_proposal';

/** Marca MCP para clientes de chat: tool solo invocable por un acto del usuario. */
export const USER_ONLY_META = { 'chat/userOnly': true } as const;

const MAX_PENDING_PER_OWNER = 20;

export type ProposalLine = { label: string; value: string };

export type ProposalRequest = {
  method: GymbroWriteMethod;
  path: string;
  body: Record<string, unknown>;
};

export type ProposalInput = {
  title: string;
  lines: ProposalLine[];
  request: ProposalRequest;
  /** Texto al confirmar con éxito ("Gasto creado."). */
  doneText: string;
  links: NavLink[];
  /** RN-ROL-007: la tarjeta pide escribir CONFIRMAR. */
  dangerous?: boolean;
};

type StoredProposal = ProposalInput & {
  id: string;
  owner: string;
  expiresAt: number;
};

const store = new Map<string, StoredProposal>();

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) {
    return null;
  }
  try {
    const json = Buffer.from(part, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Dueño de la propuesta: tenant + staff del JWT. La firma la valida Nest al ejecutar.
 */
export function ownerOf(token: string): string {
  const payload = decodeJwtPayload(token);
  const sub = typeof payload?.sub === 'string' ? payload.sub : null;
  const tenantId = typeof payload?.tenantId === 'string' ? payload.tenantId : null;
  if (sub && tenantId) {
    return `${tenantId}:${sub}`;
  }
  return `token:${createHash('sha256').update(token).digest('hex')}`;
}

function sweep(now: number): void {
  for (const [id, proposal] of store) {
    if (proposal.expiresAt <= now) {
      store.delete(id);
    }
  }
}

/**
 * Guarda la propuesta (en memoria: un restart la invalida) y devuelve la tarjeta.
 *
 * @remarks No ejecuta nada. Solo {@link takeProposal} desde la tool de confirmación.
 */
export function createProposal(owner: string, input: ProposalInput) {
  const now = Date.now();
  sweep(now);
  const mine = [...store.values()]
    .filter((item) => item.owner === owner)
    .sort((a, b) => a.expiresAt - b.expiresAt);
  while (mine.length >= MAX_PENDING_PER_OWNER) {
    const oldest = mine.shift();
    if (oldest) {
      store.delete(oldest.id);
    }
  }
  const id = randomUUID();
  const expiresAt = now + PROPOSAL_TTL_MS;
  store.set(id, { ...input, id, owner, expiresAt });
  return {
    proposal: {
      id,
      title: input.title,
      lines: input.lines,
      dangerous: input.dangerous === true,
      expiresAt: new Date(expiresAt).toISOString(),
      confirmTool: CONFIRM_TOOL,
    },
    note: 'Todavía NO se hizo nada. El usuario tiene que tocar Confirmar en la tarjeta (vence en 2 minutos). No digas que quedó hecho; resumí en una línea qué se va a hacer.',
  };
}

export type TakeResult =
  | { ok: true; proposal: StoredProposal }
  | { ok: false; reason: 'expired' };

/**
 * Saca la propuesta del store (un solo uso). Otro dueño o vencida → `expired`.
 */
export function takeProposal(id: string, owner: string): TakeResult {
  const proposal = store.get(id);
  if (!proposal || proposal.owner !== owner) {
    return { ok: false, reason: 'expired' };
  }
  store.delete(id);
  if (proposal.expiresAt <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, proposal };
}
