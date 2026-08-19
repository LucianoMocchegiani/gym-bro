'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import { getTenant, updateTenant } from '@/lib/api/tenants';
import type { TenantDetail, TenantStatus } from '@/lib/api/tenants';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Edición / suspensión de tenant (CU-ROL-002).
 *
 * @remarks Kuatia es compartido vía env API (`KUATIA_*`); no hay provision por gym.
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
  const [confirmSave, setConfirmSave] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TenantStatus | null>(null);

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
    if (!tenant) {
      return;
    }
    const dirty = name !== tenant.name || slug !== tenant.slug;
    if (!dirty) {
      // Sin cambios: no pegarle a la API.
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateTenant(tenantId, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
      });
      setTenant(updated);
      setName(updated.name);
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

  async function doSetStatus() {
    if (!statusTarget) {
      return;
    }
    const status = statusTarget;
    const label = status === 'SUSPENDED' ? 'suspender' : 'reactivar';
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
      setStatusTarget(null);
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
      {!tenant && !loadError ? <SkeletonForm fields={3} /> : null}

      {tenant ? (
        <Panel
          title="Datos"
          description={
            <>
              Admin:{' '}
              <a href={tenantOrigin(tenant.slug)} target="_blank" rel="noreferrer">
                {tenantOrigin(tenant.slug)}
              </a>
              . SSI/Kuatia: wallets compartidos en API env (consola Kuatia).
            </>
          }
          className="form-panel"
        >
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
                onChange={(e) => setSlug(e.target.value)}
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
                  onClick={() => setStatusTarget('SUSPENDED')}
                >
                  Suspender
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={statusBusy}
                  onClick={() => setStatusTarget('ACTIVE')}
                >
                  Reactivar
                </button>
              )}
            </div>
          </form>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios del gym?"
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => {
          setConfirmSave(false);
          void doSave();
        }}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={
          statusTarget === 'SUSPENDED' ? 'Suspender gym' : 'Reactivar gym'
        }
        description={`¿Confirmás ${
          statusTarget === 'SUSPENDED' ? 'suspender' : 'reactivar'
        } este gym?`}
        confirmLabel={
          statusTarget === 'SUSPENDED' ? 'Suspender' : 'Reactivar'
        }
        tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        busy={statusBusy}
        onConfirm={() => void doSetStatus()}
        onCancel={() => setStatusTarget(null)}
      />
    </SuperShell>
  );
}
