'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
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
  const [confirmSave, setConfirmSave] = useState(false);

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
    const dirty =
      name !== role.name ||
      JSON.stringify([...permissionCodes].sort()) !==
        JSON.stringify([...role.permissionCodes].sort());
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
    return <SkeletonForm fields={3} />;
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      <p className="muted small">
        {role.isSystem ? 'Rol del sistema' : 'Rol personalizado'}
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

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios del rol? Afecta los permisos de los staff que lo tengan asignado."
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
