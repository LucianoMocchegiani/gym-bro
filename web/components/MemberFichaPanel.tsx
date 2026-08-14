'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  getMember,
  updateMember,
  updateMemberStatus,
} from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

/**
 * Ficha + cambio de status del afiliado (CU-AFI-002/003).
 */
export function MemberFichaPanel({
  memberId,
  onSaved,
}: {
  memberId: string;
  onSaved?: (member: MemberDetail) => void;
}) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [status, setStatus] = useState<MemberStatus>('ACTIVE');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const m = await getMember(memberId);
        if (cancelled) {
          return;
        }
        setMember(m);
        setName(m.name ?? '');
        setEmail(m.email);
        setPhone(m.phone ?? '');
        setDocument(m.document ?? '');
        setStatus(m.status);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el afiliado',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateMember(memberId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        document: document.trim() ? document.trim() : null,
      });
      setMember(updated);
      setSaveOk(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la ficha',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(e: FormEvent) {
    e.preventDefault();
    if (!member || status === member.status) {
      return;
    }
    const ok = window.confirm(
      `¿Cambiar estado a ${formatMemberStatus(status)}?`,
    );
    if (!ok) {
      return;
    }
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await updateMemberStatus(memberId, status);
      setMember(updated);
      setStatus(updated.status);
      onSaved?.(updated);
    } catch (err) {
      setStatusError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cambiar el estado',
      );
      setStatus(member.status);
    } finally {
      setStatusBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!member) {
    return <p className="muted">Cargando ficha…</p>;
  }

  return (
    <div className="admin-stack">
      <Panel title="Datos">
        <form className="admin-form" onSubmit={(e) => void onSave(e)}>
          <label>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Documento
            <input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </label>
          {saveError ? <p className="error">{saveError}</p> : null}
          {saveOk ? <p className="ok-msg">Ficha guardada.</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar ficha'}
          </button>
        </form>
      </Panel>

      <Panel title="Estado">
        <form className="admin-form" onSubmit={(e) => void onStatus(e)}>
          <p className="muted small">
            Actual:{' '}
            <StatusPill tone={memberStatusTone(member.status)}>
              {formatMemberStatus(member.status)}
            </StatusPill>
          </p>
          <label>
            Nuevo estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
            >
              <option value="ACTIVE">Activo</option>
              <option value="SUSPENDED">Suspendido</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </label>
          {statusError ? <p className="error">{statusError}</p> : null}
          <button
            type="submit"
            className="primary"
            disabled={statusBusy || status === member.status}
          >
            {statusBusy ? 'Actualizando…' : 'Cambiar estado'}
          </button>
        </form>
      </Panel>
    </div>
  );
}
