'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import {
  createAccessLink,
  deleteAccessLink,
  listAccessLinks,
} from '@/lib/api/access';
import type { AccessIdentityLink, AccessLinkSubject } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import { getMember } from '@/lib/api/members';

const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Números de usuario del acceso ZKTeco vinculados a un socio o staff.
 *
 * @remarks RN-ACC-011: si un socio no tiene vínculo, el aparato puede usar su
 * DNI como número. El staff siempre necesita vínculo.
 */
export function AccessLinksPanel({
  kind,
  subjectId,
}: {
  kind: AccessLinkSubject['kind'];
  subjectId: string;
}) {
  const subject = useMemo<AccessLinkSubject>(
    () => ({ kind, id: subjectId }),
    [kind, subjectId],
  );
  const [links, setLinks] = useState<AccessIdentityLink[] | null>(null);
  const [document, setDocument] = useState<string | null>(null);
  const [externalId, setExternalId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AccessIdentityLink | null>(null);

  const load = useCallback(async () => {
    try {
      setLinks(await listAccessLinks(subject));
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar los vínculos',
      );
    }
  }, [subject]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (subject.kind !== 'member') return;
    let cancelled = false;
    void getMember(subject.id)
      .then((m) => {
        if (!cancelled) setDocument(m.document);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [subject]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const value = externalId.trim();
    if (!EXTERNAL_ID_PATTERN.test(value)) {
      setError('Usá solo letras, números, guion o guion bajo (hasta 32).');
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await createAccessLink(subject, value);
      setExternalId('');
      setOk(`Número ${value} vinculado.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo vincular el número',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(link: AccessIdentityLink) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await deleteAccessLink(subject, link.id);
      setOk(`Número ${link.externalId} desvinculado.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo desvincular el número',
      );
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!links) return <SkeletonForm fields={2} />;

  const fallback =
    subject.kind === 'member'
      ? document?.trim()
        ? `Sin vínculo, el aparato ZKTeco acepta el DNI ${document.trim()} como número.`
        : 'Sin vínculo ni DNI cargado, el aparato ZKTeco no lo reconoce.'
      : 'El staff necesita un número vinculado para entrar por ZKTeco.';

  return (
    <div className="admin-stack">
      <p className="muted small">
        Número de usuario cargado en el aparato ZKTeco (PIN o tarjeta). Las
        reglas de ingreso son las mismas que con la app.
      </p>

      {links.length > 0 ? (
        <ul className="plain-list">
          {links.map((link) => (
            <li key={link.id}>
              <strong>{link.externalId}</strong>
              {' · '}
              <span className="muted small">
                {new Date(link.createdAt).toLocaleDateString('es-AR')}
              </span>{' '}
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setToDelete(link)}
              >
                Desvincular
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{fallback}</p>
      )}

      <form className="admin-form" onSubmit={(e) => void onAdd(e)}>
        <label>
          Número del aparato
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            maxLength={32}
            required
            autoComplete="off"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {ok ? <p className="ok-msg">{ok}</p> : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Vincular número'}
        </button>
      </form>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Desvincular número"
        description={
          toDelete
            ? `El número ${toDelete.externalId} deja de dar acceso a esta persona.`
            : ''
        }
        confirmLabel="Desvincular"
        tone="danger"
        busy={busy}
        onConfirm={() => {
          if (toDelete) void onDelete(toDelete);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
