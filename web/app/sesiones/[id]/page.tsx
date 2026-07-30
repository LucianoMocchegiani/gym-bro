'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import {
  expandSessionCapacity,
  getSession,
  updateSession,
} from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/catalog-labels';

/**
 * Edición / cancelación / ampliar cupo de sesión (CU-SER-003 / CU-SER-005).
 */
export default function SesionDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const sessionId = String(params.id);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [expandTo, setExpandTo] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandBusy, setExpandBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getSession(sessionId);
        if (cancelled) {
          return;
        }
        applySession(s);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar la sesión',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function applySession(s: SessionDetail) {
    setSession(s);
    setStartsAt(toDatetimeLocalValue(s.startsAt));
    setEndsAt(toDatetimeLocalValue(s.endsAt));
    setCapacity(String(s.capacity));
    setExpandTo(String(s.capacity + 1));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateSession(sessionId, {
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        capacity: Number(capacity),
      });
      applySession(updated);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la sesión',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    if (
      !window.confirm(
        '¿Cancelar esta sesión? Las reservas asociadas pueden verse afectadas.',
      )
    ) {
      return;
    }
    setCancelBusy(true);
    setSaveError(null);
    try {
      const updated = await updateSession(sessionId, { status: 'CANCELLED' });
      applySession(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la sesión',
      );
    } finally {
      setCancelBusy(false);
    }
  }

  async function onExpand(e: FormEvent) {
    e.preventDefault();
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    setExpandBusy(true);
    setExpandError(null);
    try {
      const updated = await expandSessionCapacity(
        sessionId,
        Number(expandTo),
      );
      applySession(updated);
    } catch (err) {
      setExpandError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo ampliar el cupo',
      );
    } finally {
      setExpandBusy(false);
    }
  }

  const cancelled = session?.status === 'CANCELLED';

  return (
    <AdminShell
      title={session?.serviceName ?? 'Sesión'}
      actions={
        <Link href="/sesiones" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!session && !loadError ? <p className="muted">Cargando…</p> : null}

      {session ? (
        <AdminGrid>
          <Panel title="Datos" className="form-panel">
            <p className="muted small">
              Sucursal: {session.branchName} · Reservados:{' '}
              {session.bookedCount}/{session.capacity} ·{' '}
              {cancelled ? 'Cancelada' : 'Publicada'}
            </p>
            <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
              <label>
                Inicio
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>
              <label>
                Fin
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>
              <label>
                Cupo
                <input
                  type="number"
                  min={session.bookedCount || 1}
                  step={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  disabled={cancelled}
                />
              </label>

              {saveError ? <p className="error">{saveError}</p> : null}
              {saveOk ? <p className="ok-msg">Guardado.</p> : null}

              {!cancelled ? (
                <div className="form-actions">
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    disabled={cancelBusy}
                    onClick={() => void onCancel()}
                  >
                    {cancelBusy ? 'Cancelando…' : 'Cancelar sesión'}
                  </button>
                </div>
              ) : null}
            </form>
          </Panel>

          {!cancelled ? (
            <Panel title="Ampliar cupo" className="form-panel">
              <p className="muted small">
                Solo permite subir por encima del cupo actual (
                {session.capacity}).
              </p>
              <form className="admin-form" onSubmit={(e) => void onExpand(e)}>
                <label>
                  Nuevo cupo
                  <input
                    type="number"
                    min={session.capacity + 1}
                    step={1}
                    value={expandTo}
                    onChange={(e) => setExpandTo(e.target.value)}
                    required
                  />
                </label>
                {expandError ? <p className="error">{expandError}</p> : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={expandBusy}
                >
                  {expandBusy ? 'Ampliando…' : 'Ampliar'}
                </button>
              </form>
            </Panel>
          ) : null}
        </AdminGrid>
      ) : null}
    </AdminShell>
  );
}
