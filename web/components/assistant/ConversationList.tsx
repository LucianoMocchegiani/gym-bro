'use client';

import type { ChatConversation } from '@/lib/api/chat';

function labelOf(item: ChatConversation): string {
  const title = item.title?.trim();
  return title && title.length > 0 ? title : 'Sin título';
}

/**
 * Lista de hilos del staff. Archivar pide confirmación en el padre.
 */
export function ConversationList({
  items,
  activeId,
  disabled,
  onSelect,
  onNew,
  onArchive,
}: {
  items: ChatConversation[];
  activeId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onArchive: (id: string) => void;
}) {
  return (
    <div className="assistant-list">
      <button
        type="button"
        className="btn ghost assistant-list-new"
        onClick={onNew}
        disabled={disabled}
      >
        Nuevo
      </button>
      {items.length === 0 ? (
        <p className="muted small assistant-list-empty">Todavía no hay chats.</p>
      ) : (
        <ul className="assistant-list-items">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`assistant-list-item${item.id === activeId ? ' active' : ''}`}
                onClick={() => onSelect(item.id)}
                disabled={disabled}
              >
                {labelOf(item)}
              </button>
              <button
                type="button"
                className="assistant-list-archive"
                aria-label="Archivar conversación"
                title="Archivar"
                onClick={() => onArchive(item.id)}
                disabled={disabled}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
