'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import {
  getTenant,
  provisionTenantQuark,
  updateTenant,
} from '@/lib/api/tenants';
import type { TenantDetail, TenantStatus } from '@/lib/api/tenants';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Edición / suspensión de tenant (CU-ROL-002) + Quark provision.
 */
export default function TenantDetailPage() {
  return (
    <RequireSuper>
      <DetailInner />
    </RequireSuper>
  );
}

function DetailInner() {
  const params = useParams();
  const tenantId = String(params.id);

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [quarkBusy, setQuarkBusy] = useState(false);
  const [quarkMsg, setQuarkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const t = await getTenant(tenantId);
        if (cancelled) {
          return;
        }
        setTenant(t);
        setName(t.name);
        setSlug(t.slug);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el tenant',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateTenant(tenantId, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
      });
      setTenant(updated);
      setSlug(updated.slug);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar',
      );
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: TenantStatus) {
    const label = status === 'SUSPENDED' ? 'suspender' : 'reactivar';
    if (!window.confirm(`¿Confirmás ${label} este gym?`)) {
      return;
    }
    setStatusBusy(true);
    setSaveError(null);
    try {
      const updated = await updateTenant(tenantId, { status });
      setTenant(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : `No se pudo ${label}`,
      );
    } finally {
      setStatusBusy(false);
    }
  }

  async function retryQuark() {
    setQuarkBusy(true);
    setQuarkMsg(null);
    try {
      const updated = await provisionTenantQuark(tenantId);
      setTenant(updated);
      setQuarkMsg(
        updated.quark.status === 'READY'
          ? 'Quark listo (issuer + verifier).'
          : 'Quark sigue pendiente. Revisá el error abajo.',
      );
    } catch (err) {
      setQuarkMsg(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo reintentar Quark',
      );
    } finally {
      setQuarkBusy(false);
    }
  }

  return (
    <SuperShell
      title={tenant?.name ?? 'Tenant'}
      actions={
        <Link href="/super/tenants" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!tenant && !loadError ? <p className="muted">Cargando…</p> : null}

      {tenant ? (
        <>
          <Panel title="Editar" className="form-panel">
            <p className="muted small">
              Estado:{' '}
              {tenant.status === 'ACTIVE' ? 'Activo' : 'Suspendido'} ·{' '}
              <a
                href={`${tenantOrigin(tenant.slug)}/login`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir Admin
              </a>
            </p>
            <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
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
                Slug
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  required
                  minLength={2}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
              </label>

              {saveError ? <p className="error">{saveError}</p> : null}
              {saveOk ? <p className="ok-msg">Guardado.</p> : null}

              <div className="form-actions">
                <button type="submit" className="primary" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
                {tenant.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={statusBusy}
                    onClick={() => void setStatus('SUSPENDED')}
                  >
                    Suspender
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    disabled={statusBusy}
                    onClick={() => void setStatus('ACTIVE')}
                  >
                    Reactivar
                  </button>
                )}
              </div>
            </form>
          </Panel>

          <Panel
            title="Quark (acceso SSI)"
            description="Issuer + verifier del gym. Soft-fail: el tenant existe aunque Quark falle."
            className="form-panel"
          >
            <p>
              Estado:{' '}
              <span
                className={`status-pill ${tenant.quark.status === 'READY' ? 'active' : 'inactive'}`}
              >
                {tenant.quark.status === 'READY' ? 'Listo' : 'Pendiente'}
              </span>
            </p>
            <ul className="muted small">
              <li>
                Issuer: <code>{tenant.quark.issuerWalletId ?? '—'}</code>
                {tenant.quark.issuerDid ? (
                  <>
                    {' '}
                    · <code>{tenant.quark.issuerDid}</code>
                  </>
                ) : null}
              </li>
              <li>
                Verifier: <code>{tenant.quark.verifierWalletId ?? '—'}</code>
                {tenant.quark.verifierDid ? (
                  <>
                    {' '}
                    · <code>{tenant.quark.verifierDid}</code>
                  </>
                ) : null}
              </li>
            </ul>
            {tenant.quark.lastError ? (
              <p className="error small">{tenant.quark.lastError}</p>
            ) : null}
            {quarkMsg ? (
              <p
                className={
                  tenant.quark.status === 'READY' ? 'ok-msg' : 'muted'
                }
              >
                {quarkMsg}
              </p>
            ) : null}
            {tenant.quark.status !== 'READY' ? (
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={quarkBusy}
                  onClick={() => void retryQuark()}
                >
                  {quarkBusy ? 'Reintentando…' : 'Reintentar Quark'}
                </button>
              </div>
            ) : null}
          </Panel>
        </>
      ) : null}
    </SuperShell>
  );
}
