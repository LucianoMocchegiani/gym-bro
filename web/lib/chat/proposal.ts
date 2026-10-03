import { isSafeAdminHref, type ChatNavLink } from '@/lib/chat/links';

/** Tarjeta "propuesta de cambio" que arma el MCP (`propose_*`). RN-ASI-001. */
export type ProposalCard = {
  id: string;
  title: string;
  lines: { label: string; value: string }[];
  dangerous: boolean;
  expiresAt: string;
  confirmTool: string;
};

export type ProposalStatus = 'done' | 'failed' | 'cancelled' | 'expired';

/** Resultado de Confirmar / Cancelar (`confirm_proposal`). */
export type ProposalOutcome = {
  proposalId: string;
  status: ProposalStatus;
  message: string;
  links: ChatNavLink[];
};

const STATUSES: readonly ProposalStatus[] = ['done', 'failed', 'cancelled', 'expired'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * JSON de la salida de un tool MCP (objeto, string JSON o `content: [{ type: 'text' }]`).
 */
export function toolJson(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      return toolJson(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  if (Array.isArray(rec.content)) {
    for (const block of rec.content) {
      const item = asRecord(block);
      if (item?.type === 'text' && typeof item.text === 'string') {
        const parsed = toolJson(item.text);
        if (parsed) {
          return parsed;
        }
      }
    }
    return null;
  }
  if (rec.output !== undefined) {
    return toolJson(rec.output);
  }
  return rec;
}

export function parseProposal(value: unknown): ProposalCard | null {
  const proposal = asRecord(toolJson(value)?.proposal);
  if (!proposal) {
    return null;
  }
  const { id, title, expiresAt, confirmTool } = proposal;
  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof expiresAt !== 'string' ||
    typeof confirmTool !== 'string'
  ) {
    return null;
  }
  const lines = Array.isArray(proposal.lines)
    ? proposal.lines.flatMap((line) => {
        const row = asRecord(line);
        return row && typeof row.label === 'string' && typeof row.value === 'string'
          ? [{ label: row.label, value: row.value }]
          : [];
      })
    : [];
  return { id, title, lines, dangerous: proposal.dangerous === true, expiresAt, confirmTool };
}

export function parseProposalOutcome(value: unknown): ProposalOutcome | null {
  const rec = toolJson(value);
  if (!rec || typeof rec.proposalId !== 'string') {
    return null;
  }
  const status = STATUSES.find((item) => item === rec.status);
  if (!status) {
    return null;
  }
  const links = Array.isArray(rec.links)
    ? rec.links.flatMap((link) => {
        const row = asRecord(link);
        const href = typeof row?.href === 'string' ? row.href : '';
        return href && isSafeAdminHref(href)
          ? [{ href, label: typeof row?.label === 'string' ? row.label : href }]
          : [];
      })
    : [];
  return {
    proposalId: rec.proposalId,
    status,
    message: typeof rec.message === 'string' ? rec.message : '',
    links,
  };
}
