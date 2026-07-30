'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';
import { getStaff, setStaffRoles } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

/**
 * Asignación multi-rol de un staff (CU-ROL-004).
 */
export default function StaffDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const staffId = String(params.id);

  const [staff, setStaff] = useState<StaffUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, rs] = await Promise.all([getStaff(staffId), listRoles()]);
        if (cancelled) {
          return;
        }
        setStaff(s);
        setRoles(rs);
        setRoleIds(s.roles.map((r) => r.id));
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el staff',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await setStaffRoles(staffId, roleIds);
      setStaff(updated);
      setRoleIds(updated.roles.map((r) => r.id));
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron guardar los roles',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title={staff?.name ?? staff?.email ?? 'Staff'}
      actions={
        <Link href="/staff" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!staff && !loadError ? <p className="muted">Cargando…</p> : null}

      {staff ? (
        <Panel title="Roles asignados" className="form-panel">
          <p className="muted small">
            {staff.email}
            {!staff.active ? ' · inactivo' : ''}
          </p>
          <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
            <fieldset className="perm-checklist">
              <legend>Roles</legend>
              <p className="muted small">
                Al guardar se reemplaza el set completo (puede quedar vacío).
              </p>
              {roles.map((r) => (
                <label key={r.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                  />
                  {r.name}
                  <span className="muted small"> ({r.slug})</span>
                </label>
              ))}
            </fieldset>

            {saveError ? <p className="error">{saveError}</p> : null}
            {saveOk ? <p className="ok-msg">Guardado.</p> : null}

            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar roles'}
            </button>
          </form>
        </Panel>
      ) : null}
    </AdminShell>
  );
}
