'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { PermissionsChecklist } from '@/components/PermissionsChecklist';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { getRole, updateRole } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

/**
 * Detalle / edición de rol (Admin sistema solo lectura).
 */
export default function RolDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const roleId = String(params.id);

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [name, setName] = useState('');
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getRole(roleId);
        if (cancelled) {
          return;
        }
        setRole(r);
        setName(r.name);
        setPermissionCodes(r.permissionCodes);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el rol',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  const locked = role?.slug === 'admin';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role || locked) {
      return;
    }
    if (permissionCodes.length === 0) {
      setSaveError('Seleccioná al menos un permiso');
      return;
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateRole(roleId, {
        name: name.trim(),
        permissionCodes,
      });
      setRole(updated);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar el rol',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title={role?.name ?? 'Rol'}
      actions={
        <Link href="/roles" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!role && !loadError ? <p className="muted">Cargando…</p> : null}

      {role ? (
        <Panel title="Editar rol" className="form-panel form-panel-wide">
          <p className="muted small">
            Slug: <code>{role.slug}</code>
            {role.isSystem ? ' · sistema' : ' · custom'}
            {locked ? ' · no editable' : ''}
          </p>
          <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
            <label>
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                disabled={locked}
              />
            </label>

            <PermissionsChecklist
              selected={permissionCodes}
              onChange={setPermissionCodes}
              disabled={locked}
            />

            {saveError ? <p className="error">{saveError}</p> : null}
            {saveOk ? <p className="ok-msg">Guardado.</p> : null}

            {!locked ? (
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            ) : null}
          </form>
        </Panel>
      ) : null}
    </AdminShell>
  );
}
