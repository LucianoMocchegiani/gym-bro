'use client';

import { Fragment, type ReactNode } from 'react';
import { toolLineLabel } from '@/lib/chat/tool-label';
import { mergeLinks, isSafeAdminHref, type ChatNavLink } from '@/lib/chat/links';

export type ThreadBubble = {
  key: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  pending?: boolean;
  links?: ChatNavLink[];
};

function AssistantMarkdown({
  text,
  onOpen,
}: {
  text: string;
  onOpen: (href: string) => void;
}) {
  const chunks = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <p className="assistant-md">
      {chunks.map((part, index) => {
        const md = part.match(/^\[([^\]]+)\]\((\/[^)]+)\)$/);
        if (md) {
          const href = md[2];
          const label = md[1];
          if (isSafeAdminHref(href)) {
            return (
              <button
                key={index}
                type="button"
                className="assistant-md-link"
                onClick={() => onOpen(href)}
              >
                {label}
              </button>
            );
          }
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

function ChipRow({
  links,
  onOpen,
}: {
  links: ChatNavLink[];
  onOpen: (href: string) => void;
}) {
  if (links.length === 0) {
    return null;
  }
  return (
    <li className="assistant-chips-row">
      <div className="assistant-chips">
        {links.map((link) => (
          <button
            key={link.href}
            type="button"
            className="btn ghost assistant-chip"
            onClick={() => onOpen(link.href)}
          >
            {link.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function bubbleNode(
  item: ThreadBubble,
  onOpen: (href: string) => void,
): ReactNode {
  if (item.role === 'tool') {
    const name = item.toolName ?? 'tool';
    return (
      <li key={item.key} className="assistant-bubble tool">
        {toolLineLabel(name, Boolean(item.pending))}
      </li>
    );
  }
  if (item.role === 'user') {
    return (
      <li key={item.key} className="assistant-bubble user">
        {item.content}
      </li>
    );
  }
  return (
    <li key={item.key} className="assistant-bubble assistant">
      <AssistantMarkdown text={item.content} onOpen={onOpen} />
    </li>
  );
}

type Turn = { key: string; items: ThreadBubble[]; links: ChatNavLink[] };

function groupTurns(items: ThreadBubble[]): Turn[] {
  const turns: Turn[] = [];
  let current: Turn | null = null;

  function startTurn(item: ThreadBubble): Turn {
    const turn: Turn = { key: `turn-${item.key}`, items: [item], links: [] };
    turns.push(turn);
    return turn;
  }

  for (const item of items) {
    if (item.role === 'user' || current == null) {
      current = startTurn(item);
    } else {
      current.items.push(item);
    }
    current.links = mergeLinks(current.links, item.links ?? []);
  }
  return turns;
}

/**
 * Hilo: user, assistant (markdown liviano), tools en una línea y chips de `links`.
 */
export function MessageThread({
  items,
  emptyHint,
  onOpenLink,
}: {
  items: ThreadBubble[];
  emptyHint: string;
  onOpenLink: (href: string) => void;
}) {
  if (items.length === 0) {
    return <p className="muted assistant-thread-empty">{emptyHint}</p>;
  }

  const turns = groupTurns(items);

  return (
    <ol className="assistant-thread">
      {turns.map((turn) => (
        <Fragment key={turn.key}>
          {turn.items.map((item) => bubbleNode(item, onOpenLink))}
          <ChipRow links={turn.links} onOpen={onOpenLink} />
        </Fragment>
      ))}
    </ol>
  );
}
