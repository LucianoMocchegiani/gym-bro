'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import {
  getMember,
  getMemberAccount,
  updateMember,
  updateMemberStatus,
} from '@/lib/api/members';
import type {
  MemberAccountDetail,
  MemberDetail,
  MemberStatus,
} from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

/**
 * Ficha + estado de cuenta del afiliado (CU-AFI-002/003/004).
 */
export default function AfiliadoDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const memberId = String(params.id);

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [account, setAccount] = useState<MemberAccountDetail | null>(null);
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
        const [m, acc] = await Promise.all([
          getMember(memberId),
          getMemberAccount(memberId),
        ]);
        if (cancelled) {
          return;
        }
        setMember(m);
        setAccount(acc);
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

  async function reload() {
    try {
      const [m, acc] = await Promise.all([
        getMember(memberId),
        getMemberAccount(memberId),
      ]);
      setMember(m);
      setAccount(acc);
      setName(m.name ?? '');
      setEmail(m.email);
      setPhone(m.phone ?? '');
      setDocument(m.document ?? '');
      setStatus(m.status);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el afiliado',
      );
    }
  }

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
      await reload();
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

  return (
    <AdminShell
      title={member?.name ?? 'Afiliado'}
      actions={
        <Link href="/afiliados" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}

      {member ? (
        <AdminGrid className="member-detail">
          <Panel title="Ficha">
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
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
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
                <span className={`status-pill ${member.status.toLowerCase()}`}>
                  {formatMemberStatus(member.status)}
                </span>
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

          <Panel
            title="Estado de cuenta"
            description="Contratos, créditos, reservas y pagos recientes."
            className="account-panel"
          >
            {!account ? (
              <p className="muted">Cargando cuenta…</p>
            ) : (
              <>
                <div className="stat-row">
                  <div>
                    <p className="muted small">Contratos activos</p>
                    <p className="stat-value">
                      {account.summary.activeContracts}
                    </p>
                  </div>
                  <div>
                    <p className="muted small">Acceso libre</p>
                    <p className="stat-value">
                      {account.summary.hasAccessLibre ? 'Sí' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="muted small">Créditos</p>
                    <p className="stat-value">
                      {account.summary.totalCreditsRemaining}
                    </p>
                  </div>
                  <div>
                    <p className="muted small">Deuda</p>
                    <p className="stat-value">
                      {account.debt.status === 'AL_DIA'
                        ? 'Al día'
                        : `$${account.debt.amount}`}
                    </p>
                  </div>
                </div>

                <h3>Contratos</h3>
                {account.contracts.length === 0 ? (
                  <p className="muted">Sin contratos.</p>
                ) : (
                  <ul className="plain-list">
                    {account.contracts.map((c) => (
                      <li key={c.id}>
                        <strong>{c.packName}</strong> — {c.status}
                        {c.hasAccessLibre ? ' · libre' : ''}
                        {c.creditBalances?.length
                          ? ` · créditos: ${c.creditBalances
                              .map(
                                (b) =>
                                  `${b.serviceName ?? b.serviceId}:${b.remaining}`,
                              )
                              .join(', ')}`
                          : ''}
                      </li>
                    ))}
                  </ul>
                )}

                <h3>Próximas reservas</h3>
                {account.reservations.length === 0 ? (
                  <p className="muted">Sin reservas próximas.</p>
                ) : (
                  <ul className="plain-list">
                    {account.reservations.map((r) => (
                      <li key={r.id}>
                        {r.serviceName} —{' '}
                        {new Date(r.startsAt).toLocaleString('es-AR')} (
                        {r.coverage})
                      </li>
                    ))}
                  </ul>
                )}

                <h3>Pagos recientes</h3>
                {account.recentPayments.length === 0 ? (
                  <p className="muted">Sin pagos.</p>
                ) : (
                  <ul className="plain-list">
                    {account.recentPayments.map((p) => (
                      <li key={p.id}>
                        ${p.amount} · {p.method} · {p.status} ·{' '}
                        {new Date(p.createdAt).toLocaleString('es-AR')}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Panel>
        </AdminGrid>
      ) : null}
    </AdminShell>
  );
}
