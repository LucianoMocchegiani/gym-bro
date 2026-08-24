'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { impersonateStaff } from '@/lib/api/auth';
import { listStaffByTenant } from '@/lib/api/staff';
import { writeStaffSession } from '@/lib/auth/session';
import { readSuperSession } from '@/lib/auth/super-session';
import type { StaffUserDetail } from '@/lib/api/staff';
import { ApiClientError } from '@/lib/api/client';
import { StatusPill, activeTone } from '@/components/StatusPill';

type Props = {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
};

/**
 * Panel que lista el staff de un tenant y permite impersonar (Super Admin).
 */
export function TenantStaffPanel({ tenantId, tenantName, onClose }: Props) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listStaffByTenant(tenantId, { pageSize: 100 });
        if (!cancelled) setStaff(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar el staff',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleImpersonate = useCallback(
    async (s: StaffUserDetail) => {
      const superSession = readSuperSession();
      if (!superSession) return;

      setImpersonatingId(s.id);
      try {
        const res = await impersonateStaff(tenantId, s.id);
        // Guardar como staff session con flag de impersonación
        writeStaffSession(res, null, true);
        // Navegar al dashboard staff
        router.replace('/');
      } catch (err) {
        setImpersonatingId(null);
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo impersonar',
        );
      }
    },
    [tenantId, router],
  );

  return (
    <div>
      <p className="text-sm text-muted mb-3">
        Staff de <strong>{tenantName}</strong>. Click en &quot;Entrar como&quot; para
        acceder como ese usuario (sesión temporal 4h).
      </p>

      {loading && <p className="text-sm text-muted">Cargando...</p>}
      {error && <p className="text-sm err">{error}</p>}

      {!loading && !error && staff.length === 0 && (
        <p className="text-sm text-muted">No hay staff en este tenant.</p>
      )}

      {!loading && staff.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Estado</th>
              <th className="text-right py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2">{s.name || '---'}</td>
                <td className="py-2">{s.email}</td>
                <td className="py-2">
                  <StatusPill tone={activeTone(s.active)}>
                    {s.active ? 'Activo' : 'Inactivo'}
                  </StatusPill>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={!s.active || impersonatingId !== null}
                    onClick={() => handleImpersonate(s)}
                  >
                    {impersonatingId === s.id ? 'Entrando...' : 'Entrar como'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex justify-end mt-4">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
