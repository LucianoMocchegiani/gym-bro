'use client';

import { useMemo, useState } from 'react';
import type { ChatConversation } from '@/lib/api/chat';
import { IconBack, IconMore, IconSearch } from '@/components/assistant/icons';
import styles from '@/components/assistant/assistant.module.css';

function labelOf(item: ChatConversation): string {
  const title = item.title?.trim();
  return title && title.length > 0 ? title : 'Sin título';
}

function groupLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return 'Anteriores';
  }
  const days = (Date.now() - then) / 86_400_000;
  return days <= 31 ? 'Último mes' : 'Anteriores';
}

type Group = { label: string; items: ChatConversation[] };

function groupConversations(items: ChatConversation[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const label = groupLabel(item.updatedAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

/**
 * Historial a pantalla completa del drawer (no es un sidebar).
 */
export function ConversationList({
  items,
  activeId,
  disabled,
  onBack,
  onSelect,
  onArchive,
}: {
  items: ChatConversation[];
  activeId: string | null;
  disabled: boolean;
  onBack: () => void;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) {
      return items;
    }
    return items.filter((item) => labelOf(item).toLocaleLowerCase('es').includes(needle));
  }, [items, query]);
  const groups = groupConversations(filtered);

  return (
    <div className={styles.history}>
      <div className={styles.historyBar}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Volver al chat"
          onClick={onBack}
        >
          <IconBack />
        </button>
        <h3 className={styles.historyTitle}>Conversaciones</h3>
        <span />
      </div>

      <label className={styles.search}>
        <IconSearch />
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar conversación"
          autoComplete="off"
        />
      </label>

      {filtered.length === 0 ? (
        <p className={`muted small ${styles.empty}`}>
          {items.length === 0 ? 'Todavía no hay chats.' : 'Ningún chat coincide.'}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <h4 className={styles.groupTitle}>{group.label}</h4>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.listItem} ${item.id === activeId ? styles.listItemActive : ''}`}
                    onClick={() => onSelect(item.id)}
                    disabled={disabled}
                  >
                    {labelOf(item)}
                  </button>
                  <button
                    type="button"
                    className={styles.archive}
                    aria-label="Archivar conversación"
                    title="Archivar"
                    onClick={() => onArchive(item.id)}
                    disabled={disabled}
                  >
                    <IconMore />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
