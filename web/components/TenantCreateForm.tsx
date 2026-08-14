'use client';

import { FormEvent, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { createTenant } from '@/lib/api/tenants';
import type { TenantDetail } from '@/lib/api/tenants';
import { tenantHostLabel } from '@/lib/tenant-host';

/**
 * Formulario de alta de tenant + owner Admin (CU-ROL-001).
 */
export function TenantCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (created: TenantDetail) => void;
  onCancel?: () => void;
}) {
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
      onSuccess(created);
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
        Admin: <code>{tenantHostLabel(slug || '…')}</code>
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
          {busy ? 'Creando…' : 'Crear tenant'}
        </button>
      </div>
    </form>
  );
}
