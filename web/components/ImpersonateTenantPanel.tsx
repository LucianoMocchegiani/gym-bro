'use client';

import { useEffect, useState } from 'react';
import { AdminModal } from '@/components/AdminModal';
import { StatusPill, activeTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import { impersonateStaff } from '@/lib/api/auth';
import { listStaffByTenant } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';
import type { PlatformTenantSummary } from '@/lib/api/tenants';
import { tenantOrigin } from '@/lib/tenant-host';

type Props = {
  tenant: PlatformTenantSummary;
  onClose: () => void;
};

/**
 * Modal que lista el staff de un gym y permite impersonar a uno.
 *
 * @remarks Al impersonar se setea cookie en la API y se salta al subdominio
 * del gym con `?handoff=1`. La sesión se escribe allá (localStorage por origen).
 */
export function ImpersonateTenantPanel({ tenant, onClose }: Props) {
  const [staff, setStaff] = useState<StaffUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listStaffByTenant(tenant.id, { pageSize: 100 });
        if (!cancelled) {
          setStaff(data.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar el staff',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant.id]);

  async function enterAs(member: StaffUserDetail) {
    setBusyId(member.id);
    setError(null);
    try {
      const res = await impersonateStaff(tenant.id, member.id);
      window.location.replace(
        `${tenantOrigin(res.tenantSlug)}/login?handoff=1`,
      );
    } catch (err) {
      setBusyId(null);
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo impersonar',
      );
    }
  }

  return (
    <AdminModal
      open
      onClose={onClose}
      title={`Entrar como ${tenant.name}`}
      description="Elegí con qué usuario del gym querés operar."
    >
      {loading ? <p className="muted small">Cargando staff…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && staff.length === 0 ? (
        <p className="muted small">Este gym no tiene staff.</p>
      ) : null}

      {!loading && staff.length > 0 ? (
        <ul className="plain-list">
          {staff.map((s) => (
            <li
              key={s.id}
              className="catalog-row"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ flex: 1 }}>
                <p className="catalog-name">{s.name || s.email}</p>
                <p className="muted small">{s.email}</p>
              </div>
              <StatusPill tone={activeTone(s.active)}>
                {s.active ? 'Activo' : 'Inactivo'}
              </StatusPill>
              <button
                type="button"
                className="primary"
                disabled={!s.active || busyId !== null}
                onClick={() => void enterAs(s)}
              >
                {busyId === s.id ? 'Entrando…' : 'Entrar como'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminModal>
  );
}
