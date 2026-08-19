'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  expandSessionCapacity,
  getSession,
  updateSession,
} from '@/lib/api/sessions';
import type { SessionDetail } from '@/lib/api/sessions';
import { listStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/catalog-labels';

/**
 * Datos de sesión + ampliar cupo (CU-SER): editar horario/cupo, cancelar y expandir.
 *
 * @remarks Pensado para detalle y modal; no depende de AdminShell.
 */
export function SessionDatosPanel({
  sessionId,
  onSaved,
  embedded = false,
  onCancel,
}: {
  sessionId: string;
  onSaved?: (session: SessionDetail) => void;
  /** Omite título "Datos" si el modal ya lo muestra. */
  embedded?: boolean;
  /** Si el panel se renderiza en un modal: cierra al guardar sin cambios. */
  onCancel?: () => void;
}) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [expandTo, setExpandTo] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [instructors, setInstructors] = useState<StaffUserDetail[]>([]);
  const [instructorHint, setInstructorHint] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandBusy, setExpandBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  function applySession(s: SessionDetail) {
    setSession(s);
    setStartsAt(toDatetimeLocalValue(s.startsAt));
    setEndsAt(toDatetimeLocalValue(s.endsAt));
    setCapacity(String(s.capacity));
    setExpandTo(String(s.capacity + 1));
    setInstructorId(s.instructorId ?? '');
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listStaff({
          pageSize: 100,
          order: 'asc',
          orderBy: 'name',
        });
        if (!cancelled) {
          setInstructors(result.items.filter((st) => st.active));
        }
      } catch (err) {
        if (!cancelled) {
          // Sin staff.read no se puede editar; se muestra solo lectura.
          setInstructorHint(
            err instanceof ApiClientError
              ? `No se pudo cargar staff (${err.message})`
              : 'No se pudo cargar staff',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    const dirty =
      startsAt !== toDatetimeLocalValue(session.startsAt) ||
      endsAt !== toDatetimeLocalValue(session.endsAt) ||
      capacity !== String(session.capacity) ||
      instructorId !== (session.instructorId ?? '');
    if (!dirty) {
      // Sin cambios: no pegarle a la API; si es modal, cerrar.
      onCancel?.();
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateSession(sessionId, {
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        capacity: Number(capacity),
        instructorId: instructorId || null,
      });
      applySession(updated);
      setSaveOk(true);
      onSaved?.(updated);
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

  async function doCancel() {
    if (!session || session.status === 'CANCELLED') {
      return;
    }
    setCancelBusy(true);
    setSaveError(null);
    try {
      const updated = await updateSession(sessionId, { status: 'CANCELLED' });
      applySession(updated);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar la sesión',
      );
    } finally {
      setCancelBusy(false);
      setConfirmCancel(false);
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
      onSaved?.(updated);
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

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!session) {
    return <SkeletonForm fields={4} />;
  }

  const cancelled = session.status === 'CANCELLED';

  const datosForm = (
    <>
      <p className="muted small">
        Sucursal: {session.branchName} · Reservados: {session.bookedCount}/
        {session.capacity} · {cancelled ? 'Cancelada' : 'Publicada'}
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
        {instructors.length > 0 ? (
          <label>
            Staff a cargo
            <select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              disabled={cancelled}
            >
              <option value="">Sin asignar</option>
              {instructors.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name?.trim() || st.email}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted small">
            Staff a cargo:{' '}
            {session.instructorName ??
              'Sin asignar'}
            {instructorHint ? ` · ${instructorHint}` : ''}
          </p>
        )}

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
              onClick={() => setConfirmCancel(true)}
            >
              {cancelBusy ? 'Cancelando…' : 'Cancelar sesión'}
            </button>
          </div>
        ) : null}
      </form>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios de la sesión (horario/cupo)?"
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => {
          setConfirmSave(false);
          void doSave();
        }}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar sesión"
        description="¿Cancelar esta sesión? Las reservas asociadas pueden verse afectadas."
        confirmLabel="Cancelar sesión"
        tone="danger"
        busy={cancelBusy}
        onConfirm={() => void doCancel()}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );

  return (
    <div className="admin-stack">
      {embedded ? (
        datosForm
      ) : (
        <Panel title="Datos" className="form-panel">
          {datosForm}
        </Panel>
      )}

      {!cancelled ? (
        <Panel title="Ampliar cupo" className="form-panel">
          <p className="muted small">
            Solo permite subir por encima del cupo actual ({session.capacity}).
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
            <button type="submit" className="primary" disabled={expandBusy}>
              {expandBusy ? 'Ampliando…' : 'Ampliar'}
            </button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
