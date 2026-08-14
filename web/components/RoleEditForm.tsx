'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PermissionsChecklist } from '@/components/PermissionsChecklist';
import { ApiClientError } from '@/lib/api/client';
import { getRole, updateRole } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

/**
 * Formulario de edición de rol (Admin sistema solo lectura).
 */
export function RoleEditForm({
  roleId,
  onSuccess,
  onCancel,
}: {
  roleId: string;
  onSuccess: (updated: RoleDetail) => void;
  onCancel?: () => void;
}) {
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [name, setName] = useState('');
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    try {
      const updated = await updateRole(roleId, {
        name: name.trim(),
        permissionCodes,
      });
      onSuccess(updated);
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

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!role) {
    return <p className="muted">Cargando…</p>;
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      <p className="muted small">
        Slug: <code>{role.slug}</code>
        {role.isSystem ? ' · sistema' : ' · custom'}
        {locked ? ' · no editable' : ''}
      </p>
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
        disabled={locked || busy}
      />

      {saveError ? <p className="error">{saveError}</p> : null}

      <div className="admin-modal-actions">
        {onCancel ? (
          <button
            type="button"
            className="btn ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
        ) : null}
        {!locked ? (
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        ) : null}
      </div>
    </form>
  );
}
