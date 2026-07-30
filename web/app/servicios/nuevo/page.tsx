'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { createService } from '@/lib/api/services';
import type { ServiceType } from '@/lib/api/services';

/**
 * Alta de servicio (CU-SER-001).
 */
export default function NuevoServicioPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [type, setType] = useState<ServiceType>('ACCESO_LIBRE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dropInPrice, setDropInPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createService({
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        dropInPrice:
          type === 'POR_SESIONES' && dropInPrice.trim()
            ? Number(dropInPrice)
            : undefined,
      });
      router.replace(`/servicios/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el servicio',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Nuevo servicio"
      actions={
        <Link href="/servicios" className="btn ghost">
          Volver
        </Link>
      }
    >
      <Panel title="Datos del servicio" className="form-panel">
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <label>
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ServiceType)}
            >
              <option value="ACCESO_LIBRE">Acceso libre</option>
              <option value="POR_SESIONES">Por sesiones</option>
            </select>
          </label>
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
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          {type === 'POR_SESIONES' ? (
            <label>
              Precio drop-in (ARS)
              <input
                type="number"
                min={0}
                step={1}
                value={dropInPrice}
                onChange={(e) => setDropInPrice(e.target.value)}
                placeholder="Opcional"
              />
            </label>
          ) : null}

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear servicio'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
