'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequireSuper } from '@/components/RequireSuper';
import { SuperShell } from '@/components/SuperShell';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import { createTenant } from '@/lib/api/tenants';

/**
 * Alta de tenant + owner Admin (CU-ROL-001).
 */
export default function NuevoTenantPage() {
  return (
    <RequireSuper>
      <NuevoInner />
    </RequireSuper>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createTenant({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        ownerName: ownerName.trim() || undefined,
      });
      router.replace(`/super/tenants/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el tenant',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SuperShell
      title="Nuevo tenant"
      actions={
        <Link href="/super/tenants" className="btn ghost">
          Volver
        </Link>
      }
    >
      <Panel title="Gym + owner Admin" className="form-panel">
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
          <label>
            Slug (subdominio)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              minLength={2}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="fit-palermo"
            />
          </label>
          <p className="muted small">
            Admin: <code>{slug || '…'}.localhost:3000</code>
          </p>
          <label>
            Owner email
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Owner password
            <input
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Owner nombre
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear tenant'}
          </button>
        </form>
      </Panel>
    </SuperShell>
  );
}
