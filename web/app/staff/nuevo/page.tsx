'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';
import { createStaff } from '@/lib/api/staff';

/**
 * Alta de staff con roles iniciales opcionales.
 */
export default function NuevoStaffPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listRoles();
        if (cancelled) {
          return;
        }
        setRoles(data);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar roles',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createStaff({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        roleIds: roleIds.length > 0 ? roleIds : undefined,
      });
      router.replace(`/staff/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el staff',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Nuevo staff"
      actions={
        <Link href="/staff" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}

      <Panel title="Datos" className="form-panel">
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password inicial
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          <fieldset className="perm-checklist">
            <legend>Roles iniciales</legend>
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

          {error ? <p className="error">{error}</p> : null}

          <button
            type="submit"
            className="primary"
            disabled={busy || !!loadError}
          >
            {busy ? 'Guardando…' : 'Crear staff'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
