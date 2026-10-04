'use client';

import { useEffect, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { ApiClientError } from '@/lib/api/client';
import {
  listMyNotificationPrefs,
  setMyNotificationPref,
  type MemberNotification,
  type NotificationEmailPref,
} from '@/lib/api/member-portal';
import { NOTIFICATION_EVENT_LABELS } from '@/lib/api/notification-templates';
import { formatSessionWhen } from '@/lib/format-session';
import { useMemberArea } from './MemberArea';

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function NoticeList({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: MemberNotification[];
  onOpen: (n: MemberNotification) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      <h3 className="portal-day-title">{title}</h3>
      <ul className="portal-slots">
        {items.map((n) => (
          <li
            key={n.id}
            className={`portal-slot${n.inAppRead ? '' : ' is-new'}`}
          >
            <div>
              <p className="portal-slot-when">
                {formatSessionWhen(n.createdAt)}
              </p>
              <p className="portal-slot-name">{n.title}</p>
            </div>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => onOpen(n)}
            >
              Ver
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Avisos del socio (CU-NOT-005) y correo por tipo de aviso (CU-NOT-003), como
 * la bandeja y las preferencias de la app. La bandeja vive en el contexto del
 * portal: abrir un aviso lo marca leído y baja el contador del menú.
 */
export function MemberNotices() {
  const { notices } = useMemberArea();
  const [open, setOpen] = useState<MemberNotification | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openNotice(n: MemberNotification) {
    setOpen(n);
    try {
      await notices.markRead(n.id);
    } catch (err) {
      setError(errorText(err, 'No se pudo marcar el aviso como leído'));
    }
  }

  const items = notices.items;
  return (
    <>
      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Avisos</p>
        <h2 className="mkt-h2">Tus avisos</h2>
        {notices.error ? <p className="error">{notices.error}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!items ? (
          notices.error ? null : <p className="muted">Cargando avisos…</p>
        ) : items.length === 0 ? (
          <p className="muted">Todavía no tenés avisos.</p>
        ) : (
          <>
            <NoticeList
              title="Nuevos"
              items={items.filter((n) => !n.inAppRead)}
              onOpen={(n) => void openNotice(n)}
            />
            <NoticeList
              title={notices.unread > 0 ? 'Anteriores' : 'Bandeja'}
              items={items.filter((n) => n.inAppRead)}
              onOpen={(n) => void openNotice(n)}
            />
          </>
        )}
        <div className="mkt-hero-actions">
          <button
            type="button"
            className="mkt-btn-ghost"
            onClick={notices.reload}
          >
            Actualizar
          </button>
        </div>
      </section>

      <EmailPrefs />

      <AdminModal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.title ?? ''}
        description={open ? formatSessionWhen(open.createdAt) : undefined}
      >
        <p className="portal-notice-body">{open?.body}</p>
      </AdminModal>
    </>
  );
}

/** Correo por tipo de aviso; la bandeja no se apaga (RN de notificaciones). */
function EmailPrefs() {
  const [prefs, setPrefs] = useState<NotificationEmailPref[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyNotificationPrefs();
        if (!cancelled) {
          setPrefs(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorText(err, 'No se pudieron cargar tus preferencias'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(pref: NotificationEmailPref) {
    setBusy(pref.eventCode);
    setError(null);
    try {
      const saved = await setMyNotificationPref(
        pref.eventCode,
        !pref.emailEnabled,
      );
      setPrefs(
        (prev) =>
          prev?.map((p) => (p.eventCode === saved.eventCode ? saved : p)) ??
          prev,
      );
    } catch (err) {
      setError(errorText(err, 'No se pudo guardar la preferencia'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mkt-inner mkt-section">
      <h2 className="mkt-h2">Avisos por correo</h2>
      <p className="muted">
        Elegí qué avisos te llegan también por mail. Acá en la bandeja los ves
        siempre.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {!prefs ? (
        error ? null : <p className="muted">Cargando…</p>
      ) : (
        <div className="portal-prefs">
          {prefs.map((p) => (
            <label key={p.eventCode} className="checkbox-row">
              <input
                type="checkbox"
                checked={p.emailEnabled}
                disabled={busy === p.eventCode}
                onChange={() => void toggle(p)}
              />
              {NOTIFICATION_EVENT_LABELS[p.eventCode] ?? p.eventCode}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
