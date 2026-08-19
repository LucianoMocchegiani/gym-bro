'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { deleteTenant, getTenant, updateTenant } from '@/lib/api/tenants';
import type { TenantDetail, TenantStatus } from '@/lib/api/tenants';

/**
 * Edición / suspensión / eliminación de tenant (CU-ROL-002), usable en modal o página.
 *
 * @remarks Kuatia es compartido vía env API (`KUATIA_*`); no hay provision por gym.
 * La eliminación es física en cascada: exige `ELIMINAR` + slug.
 */
export function TenantEditPanel({
  tenantId,
  onSaved,
  onDeleted,
  onCancel,
}: {
  tenantId: string;
  onSaved?: (tenant: TenantDetail) => void;
  /** Se invoca tras eliminar el tenant (el panel se desmonta). */
  onDeleted?: () => void;
  /** Si el panel se renderiza en un modal: cierra al guardar sin cambios. */
  onCancel?: () => void;
}) {
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
      // Sin cambios: no pegarle a la API; si es modal, cerrar.
      onCancel?.();
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    if (!tenant) {
      return;
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateTenant(tenant.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
      });
      setTenant(updated);
      setName(updated.name);
      setSlug(updated.slug);
      setSaveOk(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError ? err.message : 'No se pudo guardar',
      );
    } finally {
      setBusy(false);
    }
  }

  async function doSetStatus() {
    if (!tenant || !statusTarget) {
      return;
    }
    const status = statusTarget;
    const label = status === 'SUSPENDED' ? 'suspender' : 'reactivar';
    setStatusBusy(true);
    setSaveError(null);
    try {
      const updated = await updateTenant(tenant.id, { status });
      setTenant(updated);
      onSaved?.(updated);
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

  async function doDelete() {
    if (!tenant) {
      return;
    }
    setDeleteBusy(true);
    setSaveError(null);
    try {
      await deleteTenant(tenant.id, 'ELIMINAR', tenant.slug);
      onDeleted?.();
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo eliminar el tenant',
      );
      setDeleteConfirm(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!tenant) {
    return <SkeletonForm fields={3} />;
  }

  return (
    <div className="admin-stack">
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

        <div className="admin-modal-actions">
          {onCancel ? (
            <button
              type="button"
              className="btn ghost"
              onClick={onCancel}
              disabled={busy || statusBusy}
            >
              Cancelar
            </button>
          ) : null}
          <button type="submit" className="btn" disabled={busy || statusBusy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          {tenant.status === 'ACTIVE' ? (
            <button
              type="button"
              className="btn danger"
              disabled={busy || statusBusy}
              onClick={() => setStatusTarget('SUSPENDED')}
            >
              Suspender
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={busy || statusBusy}
              onClick={() => setStatusTarget('ACTIVE')}
            >
              Reactivar
            </button>
          )}
          <button
            type="button"
            className="btn danger"
            disabled={busy || statusBusy}
            onClick={() => setDeleteConfirm(true)}
          >
            Eliminar gym
          </button>
        </div>
      </form>

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
        title={statusTarget === 'SUSPENDED' ? 'Suspender gym' : 'Reactivar gym'}
        description={`¿Confirmás ${
          statusTarget === 'SUSPENDED' ? 'suspender' : 'reactivar'
        } este gym?`}
        confirmLabel={statusTarget === 'SUSPENDED' ? 'Suspender' : 'Reactivar'}
        tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        busy={statusBusy}
        onConfirm={() => void doSetStatus()}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmDialog
        open={deleteConfirm}
        title="Eliminar gym"
        description={
          tenant
            ? `Esto borra en físico el gym ${tenant.name} (slug ${tenant.slug}) con todo su contenido: staff, afiliados, contratos, pagos, caja y auditoría. No se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar gym"
        tone="danger"
        confirmWord="ELIMINAR"
        confirmWord2={tenant?.slug}
        busy={deleteBusy}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}