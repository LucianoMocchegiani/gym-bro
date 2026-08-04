'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { createSession } from '@/lib/api/sessions';
import {
  formatServiceType,
  fromDatetimeLocalValue,
} from '@/lib/catalog-labels';

/**
 * Alta de sesión puntual publicada (CU-SER-003).
 */
export default function NuevaSesionPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listServices({
          type: 'POR_SESIONES',
          active: true,
          pageSize: 100,
        });
        if (cancelled) {
          return;
        }
        setServices(data.items);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar servicios',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createSession({
        serviceId,
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        capacity: Number(capacity),
      });
      router.replace(`/sesiones/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear la sesión',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Nueva sesión"
      actions={
        <Link href="/sesiones" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}

      <Panel title="Sesión puntual" className="form-panel">
        <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
          <label>
            Servicio (por sesiones)
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
            >
              <option value="">Elegir…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatServiceType(s.type)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Inicio
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>
          <label>
            Cupo
            <input
              type="number"
              min={1}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button
            type="submit"
            className="primary"
            disabled={busy || !!loadError}
          >
            {busy ? 'Guardando…' : 'Crear sesión'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
