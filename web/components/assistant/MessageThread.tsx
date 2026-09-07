'use client';

import { toolLineLabel } from '@/lib/chat/tool-label';

export type ThreadBubble = {
  key: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  pending?: boolean;
};

function AssistantMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="assistant-md">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

/**
 * Hilo: user, assistant (markdown liviano) y tools en una línea.
 */
export function MessageThread({
  items,
  emptyHint,
}: {
  items: ThreadBubble[];
  emptyHint: string;
}) {
  if (items.length === 0) {
    return <p className="muted assistant-thread-empty">{emptyHint}</p>;
  }

  return (
    <ol className="assistant-thread">
      {items.map((item) => {
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
            <AssistantMarkdown text={item.content} />
          </li>
        );
      })}
    </ol>
  );
}
