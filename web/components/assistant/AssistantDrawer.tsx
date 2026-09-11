'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Composer } from '@/components/assistant/Composer';
import { ConversationList } from '@/components/assistant/ConversationList';
import {
  IconClose,
  IconCollapse,
  IconExpand,
  IconHistory,
  IconNewChat,
  IconSparkle,
} from '@/components/assistant/icons';
import {
  MessageThread,
  type ThreadBubble,
} from '@/components/assistant/MessageThread';
import {
  archiveChatConversation,
  ChatClientError,
  createChatConversation,
  listChatConversations,
  listChatMessages,
  setChatAccessTokenOverride,
  streamChatTurn,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/api/chat';
import { ensurePublicChatSession, resetPublicChatSession } from '@/lib/api/public-chat';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  clearLastConversationId,
  readLastConversationId,
  writeLastConversationId,
} from '@/lib/chat/last-conversation';
import { isSafeAdminHref, parseLinksFromAssistantText, parseToolLinks } from '@/lib/chat/links';
import { titleFromFirstMessage } from '@/lib/chat/title';
import styles from '@/components/assistant/assistant.module.css';

function toBubbles(rows: ChatMessage[]): ThreadBubble[] {
  return rows
    .filter((row) => row.role === 'user' || row.role === 'assistant' || row.role === 'tool')
    .map((row) => ({
      key: row.id,
      role: row.role as 'user' | 'assistant' | 'tool',
      content: row.content,
      at: row.createdAt,
      toolName: row.toolName ?? undefined,
      links:
        row.role === 'tool'
          ? parseToolLinks(row.toolResult ?? row.content)
          : row.role === 'assistant'
            ? parseLinksFromAssistantText(row.content)
            : undefined,
    }));
}

function statusMessage(error: unknown): string {
  if (error instanceof ChatClientError) {
    return error.message;
  }
  return 'No hay red.';
}

function subscribeNever(): () => void {
  return () => undefined;
}

/**
 * Botón burbuja + drawer del asistente. Caja y el resto siguen detrás.
 *
 * @remarks `staff`: JWT Staff. `public`: sesión anónima de la landing (solo
 * get_help). Misma UI. Tools en una línea. Archivar = DELETE C2.
 */
export function AssistantLauncher({
  variant = 'staff',
}: {
  variant?: 'staff' | 'public';
}) {
  const router = useRouter();
  const { session } = useAuth();
  const tenantId = variant === 'public' ? 'public' : (session?.tenantId ?? '');
  const userId = variant === 'public' ? 'landing' : (session?.userId ?? '');
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<ThreadBubble[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const listBusy = listLoading || threadLoading || archiving;

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const el = threadRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [bubbles, streaming]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }
      if (historyOpen) {
        setHistoryOpen(false);
        return;
      }
      if (expanded) {
        setExpanded(false);
        return;
      }
      handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, historyOpen, expanded]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const loadMessages = useCallback(async (id: string) => {
    setThreadLoading(true);
    setError(null);
    try {
      const rows = await listChatMessages(id);
      setBubbles(toBubbles(rows));
    } catch (err) {
      setError(statusMessage(err));
      setBubbles([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string, title?: string | null) => {
      setActiveId(id);
      if (tenantId && userId) {
        writeLastConversationId(tenantId, userId, id);
      }
      await loadMessages(id);
    },
    [loadMessages, tenantId, userId],
  );

  const loadList = useCallback(
    async (preferId?: string | null) => {
      if (variant === 'staff' && (!tenantId || !userId)) {
        return;
      }
      setListLoading(true);
      setError(null);
      try {
        const items = await listChatConversations();
        setConversations(items);
        const last = preferId ?? readLastConversationId(tenantId, userId);
        const pick =
          (last && items.some((item) => item.id === last) ? last : null) ??
          items[0]?.id ??
          null;
        if (pick) {
          const picked = items.find((item) => item.id === pick);
          await selectConversation(pick, picked?.title);
        } else {
          setActiveId(null);
          setBubbles([]);
        }
      } catch (err) {
        if (
          variant === 'public' &&
          err instanceof ChatClientError &&
          err.status === 401
        ) {
          resetPublicChatSession();
          const fresh = await ensurePublicChatSession();
          setChatAccessTokenOverride(fresh.token);
          const items = await listChatConversations();
          setConversations(items);
          const pick = items[0]?.id ?? null;
          if (pick) {
            const picked = items.find((item) => item.id === pick);
            await selectConversation(pick, picked?.title);
          } else {
            setActiveId(null);
            setBubbles([]);
          }
          return;
        }
        setError(statusMessage(err));
        setConversations([]);
        setActiveId(null);
        setBubbles([]);
      } finally {
        setListLoading(false);
      }
    },
    [selectConversation, tenantId, userId, variant],
  );

  const handleOpen = useCallback(async () => {
    setOpen(true);
    if (variant === 'public') {
      try {
        const session = await ensurePublicChatSession();
        setChatAccessTokenOverride(session.token);
        await loadList(session.conversation.id);
      } catch (err) {
        if (err instanceof ChatClientError && err.status === 401) {
          resetPublicChatSession();
          try {
            const session = await ensurePublicChatSession();
            setChatAccessTokenOverride(session.token);
            await loadList(session.conversation.id);
          } catch (retryErr) {
            setError(statusMessage(retryErr));
          }
        } else {
          setError(statusMessage(err));
        }
      }
      return;
    }
    await loadList();
  }, [loadList, variant]);

  useEffect(() => {
    if (variant !== 'public') {
      return;
    }
    function maybeOpen(): void {
      if (window.location.hash === '#asistente') {
        void handleOpen();
      }
    }
    maybeOpen();
    window.addEventListener('hashchange', maybeOpen);
    return () => window.removeEventListener('hashchange', maybeOpen);
  }, [handleOpen, variant]);

  function handleClose(): void {
    abortRef.current?.abort();
    setHistoryOpen(false);
    setExpanded(false);
    setOpen(false);
  }

  function handleStop(): void {
    abortRef.current?.abort();
  }

  function handleOpenLink(href: string): void {
    if (variant === 'public' || !isSafeAdminHref(href)) {
      return;
    }
    handleClose();
    router.push(href);
  }

  async function handleNew(): Promise<void> {
    setError(null);
    try {
      const created = await createChatConversation();
      setConversations((prev) => [
        created,
        ...prev.filter((item) => item.id !== created.id),
      ]);
      await selectConversation(created.id, created.title);
      setBubbles([]);
    } catch (err) {
      setError(statusMessage(err));
    }
  }

  async function confirmArchive(): Promise<void> {
    if (!archiveId) {
      return;
    }
    setArchiving(true);
    setError(null);
    try {
      await archiveChatConversation(archiveId);
      const next = conversations.filter((item) => item.id !== archiveId);
      setConversations(next);
      if (activeId === archiveId) {
        const fallback = next[0]?.id ?? null;
        if (fallback) {
          await selectConversation(
            fallback,
            next.find((item) => item.id === fallback)?.title,
          );
        } else {
          setActiveId(null);
          setBubbles([]);
          if (tenantId && userId) {
            clearLastConversationId(tenantId, userId);
          }
        }
      }
      setArchiveId(null);
    } catch (err) {
      setError(statusMessage(err));
    } finally {
      setArchiving(false);
    }
  }

  async function handleSend(text: string): Promise<void> {
    setError(null);
    let conversationId = activeId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (!conversationId) {
        const created = await createChatConversation();
        conversationId = created.id;
        setConversations((prev) => [created, ...prev]);
        setActiveId(created.id);
        if (tenantId && userId) {
          writeLastConversationId(tenantId, userId, created.id);
        }
      }

      const id = conversationId;
      setConversations((prev) =>
        prev.map((item) =>
          item.id === id && !item.title?.trim()
            ? { ...item, title: titleFromFirstMessage(text) }
            : item,
        ),
      );

      const userKey = `local-user-${Date.now()}`;
      const assistantKey = `local-assistant-${Date.now()}`;
      setBubbles((prev) => [
        ...prev,
        { key: userKey, role: 'user', content: text, at: new Date().toISOString() },
      ]);
      setStreaming(true);

      const outcome = await streamChatTurn(
        id,
        text,
        {
          onToolStart: (toolCallId, toolName) => {
            setBubbles((prev) => {
              if (prev.some((item) => item.key === toolCallId)) {
                return prev;
              }
              return [
                ...prev,
                {
                  key: toolCallId,
                  role: 'tool',
                  content: '',
                  toolName,
                  pending: true,
                },
              ];
            });
          },
          onToolDone: (toolCallId, toolName, output) => {
            const links = parseToolLinks(output);
            setBubbles((prev) =>
              prev.map((item) =>
                item.key === toolCallId
                  ? { ...item, toolName, pending: false, links }
                  : item,
              ),
            );
          },
          onTextDelta: (delta) => {
            setBubbles((prev) => {
              const idx = prev.findIndex((item) => item.key === assistantKey);
              if (idx < 0) {
                return [
                  ...prev,
                  {
                    key: assistantKey,
                    role: 'assistant',
                    content: delta,
                    links: parseLinksFromAssistantText(delta),
                  },
                ];
              }
              return prev.map((item, index) => {
                if (index !== idx) {
                  return item;
                }
                const content = item.content + delta;
                return {
                  ...item,
                  content,
                  links: parseLinksFromAssistantText(content),
                };
              });
            });
          },
          onStreamError: (message) => {
            if (message.trim()) {
              setError(message);
            }
          },
        },
        controller.signal,
      );

      if (outcome === 'aborted') {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 200);
        });
      }

      if (activeIdRef.current === id) {
        const rows = await listChatMessages(id);
        setBubbles(toBubbles(rows));
      }
      const items = await listChatConversations();
      setConversations(items);
    } catch (err) {
      setError(statusMessage(err));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setStreaming(false);
    }
  }

  const helloName = session?.name?.trim().split(/\s+/)[0];
  const isEmpty = !listLoading && !threadLoading && bubbles.length === 0;
  const disclaimer =
    'Este asistente usa inteligencia artificial para responderte.';

  const overlay = (
    <>
      <div
        className={`${styles.root} ${open ? styles.rootOpen : ''} ${expanded ? styles.expanded : ''}`}
        hidden={!open}
      >
        <button
          type="button"
          className={`${styles.overlay} ${expanded ? styles.overlayHidden : ''}`}
          aria-label="Cerrar asistente"
          onClick={handleClose}
        />
        <aside
          id="assistant-panel"
          className={`${styles.panel} ${expanded ? styles.panelExpanded : ''}`}
          style={
            expanded
              ? ({
                  position: 'fixed',
                  inset: 0,
                  width: '100%',
                  height: '100dvh',
                  maxWidth: 'none',
                  borderLeft: 'none',
                } satisfies CSSProperties)
              : undefined
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-title"
        >
          <header className={styles.header}>
            <h2 id="assistant-title" className={styles.title}>
              <IconSparkle />
              Asistente
            </h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={expanded ? 'Reducir asistente' : 'Expandir asistente'}
                title={expanded ? 'Reducir' : 'Expandir'}
                aria-pressed={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? <IconCollapse /> : <IconExpand />}
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Cerrar asistente"
                onClick={handleClose}
              >
                <IconClose />
              </button>
            </div>
          </header>

          {error ? <p className={`err-msg ${styles.error}`}>{error}</p> : null}

          {historyOpen ? (
            <ConversationList
              items={conversations}
              activeId={activeId}
              disabled={listBusy || streaming}
              onBack={() => setHistoryOpen(false)}
              onSelect={(id) => {
                const item = conversations.find((row) => row.id === id);
                setHistoryOpen(false);
                void selectConversation(id, item?.title);
              }}
              onArchive={setArchiveId}
            />
          ) : (
            <div className={`${styles.main} ${isEmpty ? styles.mainEmpty : ''}`}>
              <div className={styles.toolbar}>
                {isEmpty ? null : (
                  <button
                    type="button"
                    className={styles.toolBtn}
                    aria-label="Nuevo chat"
                    title="Nuevo chat"
                    disabled={listBusy || streaming}
                    onClick={() => {
                      void handleNew();
                    }}
                  >
                    <IconNewChat />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.toolBtn}
                  aria-label="Chats anteriores"
                  title="Chats anteriores"
                  onClick={() => setHistoryOpen(true)}
                >
                  <IconHistory />
                </button>
              </div>
              <div className={styles.threadWrap} ref={threadRef}>
                {listLoading || threadLoading ? (
                  <p className="muted">Cargando…</p>
                ) : (
                  <MessageThread
                    items={bubbles}
                    helloName={variant === 'staff' ? helloName : undefined}
                    disclaimer={disclaimer}
                    onOpenLink={handleOpenLink}
                  />
                )}
              </div>
              <Composer
                disabled={listBusy}
                streaming={streaming}
                placeholder="Preguntame"
                onSend={(text) => void handleSend(text)}
                onStop={handleStop}
              />
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={archiveId !== null}
        title="Archivar conversación"
        description="Sale de la lista. No borra los mensajes."
        confirmLabel="Archivar"
        busy={archiving}
        onConfirm={() => {
          void confirmArchive();
        }}
        onCancel={() => setArchiveId(null)}
      />
    </>
  );

  return (
    <>
      {mounted
        ? createPortal(
            <button
              type="button"
              className={styles.fab}
              aria-expanded={open}
              aria-controls="assistant-panel"
              aria-label="Abrir asistente"
              title="Asistente"
              hidden={open}
              onClick={() => {
                void handleOpen();
              }}
            >
              <IconSparkle size={22} />
            </button>,
            document.body,
          )
        : null}
      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
