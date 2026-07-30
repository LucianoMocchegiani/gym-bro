'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { createMember } from '@/lib/api/members';

/**
 * Alta de afiliado (CU-AFI-001).
 */
export default function NuevoAfiliadoPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createMember({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        document: document.trim() || undefined,
      });
      router.replace(`/afiliados/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el afiliado',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Nuevo afiliado"
      actions={
        <Link href="/afiliados" className="btn ghost">
          Volver
        </Link>
      }
    >
      <Panel title="Datos del afiliado" className="form-panel">
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
          <label>
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Documento
            <input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear afiliado'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
