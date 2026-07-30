'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import { getTenant, updateTenant } from '@/lib/api/tenants';
import type { TenantDetail, TenantStatus } from '@/lib/api/tenants';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Edición / suspensión de tenant (CU-ROL-002).
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
      ) : null}
    </SuperShell>
  );
}
