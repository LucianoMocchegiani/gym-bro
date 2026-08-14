'use client';

import { FormEvent, useState } from 'react';
import { PermissionsChecklist } from '@/components/PermissionsChecklist';
import { ApiClientError } from '@/lib/api/client';
import { createRole } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';

/**
 * Formulario de alta de rol custom (CU-ROL-003), usable en página o modal.
 */
export function RoleCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (created: RoleDetail) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState('');
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (permissionCodes.length === 0) {
      setError('Seleccioná al menos un permiso');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createRole({
        name: name.trim(),
        permissionCodes,
      });
      onSuccess(created);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el rol',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
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

      <PermissionsChecklist
        selected={permissionCodes}
        onChange={setPermissionCodes}
        disabled={busy}
      />

      {error ? <p className="error">{error}</p> : null}

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
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Guardando…' : 'Crear rol'}
        </button>
      </div>
    </form>
  );
}
