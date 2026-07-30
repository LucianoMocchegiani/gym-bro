'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { PermissionsChecklist } from '@/components/PermissionsChecklist';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { createRole } from '@/lib/api/roles';

/**
 * Alta de rol custom (CU-ROL-003).
 */
export default function NuevoRolPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
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
      router.replace(`/roles/${created.id}`);
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
    <AdminShell
      title="Nuevo rol"
      actions={
        <Link href="/roles" className="btn ghost">
          Volver
        </Link>
      }
    >
      <Panel title="Datos del rol" className="form-panel form-panel-wide">
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
          />

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear rol'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
