'use client';

import { Fragment, type ReactNode } from 'react';
import { toolLineLabel } from '@/lib/chat/tool-label';
import { mergeLinks, isSafeAdminHref, type ChatNavLink } from '@/lib/chat/links';
import styles from '@/components/assistant/assistant.module.css';

export type ThreadBubble = {
  key: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  pending?: boolean;
  links?: ChatNavLink[];
  at?: string;
};

function clockOf(iso?: string): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function AssistantMarkdown({
  text,
  onOpen,
}: {
  text: string;
  onOpen: (href: string) => void;
}) {
  const chunks = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <p className={styles.md}>
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
                className={styles.mdLink}
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
    <li className={styles.chipsRow}>
      <div className={styles.chips}>
        {links.map((link) => (
          <button
            key={link.href}
            type="button"
            className={`btn ghost ${styles.chip}`}
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
      <li key={item.key} className={styles.tool}>
        {toolLineLabel(name, Boolean(item.pending))}
      </li>
    );
  }
  if (item.role === 'user') {
    const clock = clockOf(item.at);
    return (
      <li key={item.key} className={styles.user}>
        <span className={styles.userText}>{item.content}</span>
        {clock ? (
          <time className={styles.userTime} dateTime={item.at}>
            {clock}
          </time>
        ) : null}
      </li>
    );
  }
  return (
    <li key={item.key} className={styles.assistant}>
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
 * Hilo: user a la derecha, assistant sin burbuja, tools en una línea y chips.
 */
export function MessageThread({
  items,
  helloName,
  disclaimer,
  onOpenLink,
}: {
  items: ThreadBubble[];
  helloName?: string | null;
  disclaimer?: string;
  onOpenLink: (href: string) => void;
}) {
  if (items.length === 0) {
    const greeting = helloName?.trim() ? `¡Hola, ${helloName}!` : '¡Hola!';
    return (
      <div className={styles.welcome}>
        <p className={styles.welcomeHi}>{greeting}</p>
        <p className={styles.welcomeAsk}>¿Cómo puedo ayudarte?</p>
      </div>
    );
  }

  const turns = groupTurns(items);

  return (
    <ol className={styles.thread}>
      {disclaimer ? <li className={styles.disclaimer}>{disclaimer}</li> : null}
      {turns.map((turn) => (
        <Fragment key={turn.key}>
          {turn.items.map((item) => bubbleNode(item, onOpenLink))}
          <ChipRow links={turn.links} onOpen={onOpenLink} />
        </Fragment>
      ))}
    </ol>
  );
}
