'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';
import { getStaff, setStaffRoles } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

/**
 * Asignación de roles a un usuario staff (CU-ROL-004).
 */
export function StaffRolesPanel({
  staffId,
  onSaved,
  onCancel,
}: {
  staffId: string;
  onSaved?: (staff: StaffUserDetail) => void;
  /** Si el panel se renderiza en un modal: cierra al guardar sin cambios. */
  onCancel?: () => void;
}) {
  const [staff, setStaff] = useState<StaffUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, rs] = await Promise.all([
          getStaff(staffId),
          listRoles({ pageSize: 100 }),
        ]);
        if (cancelled) {
          return;
        }
        setStaff(s);
        setRoles(rs.items);
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
    if (!staff) {
      return;
    }
    const dirty =
      JSON.stringify([...roleIds].sort()) !==
      JSON.stringify(staff.roles.map((r) => r.id).sort());
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
      const updated = await setStaffRoles(staffId, roleIds);
      setStaff(updated);
      setRoleIds(updated.roles.map((r) => r.id));
      setSaveOk(true);
      onSaved?.(updated);
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

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!staff) {
    return <SkeletonForm fields={3} />;
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      <p className="muted small">
        {staff.email}
        {!staff.active ? ' · inactivo' : ''}
      </p>
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

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los roles del staff? Se reemplaza el set completo (puede quedar vacío)."
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => {
          setConfirmSave(false);
          void doSave();
        }}
        onCancel={() => setConfirmSave(false)}
      />
    </form>
  );
}
