'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { getService, updateService } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';

/**
 * Edición de servicio (CU-SER-001). El tipo no se puede cambiar.
 */
export default function ServicioDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const serviceId = String(params.id);

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dropInPrice, setDropInPrice] = useState('');
  const [active, setActive] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getService(serviceId);
        if (cancelled) {
          return;
        }
        setService(s);
        setName(s.name);
        setDescription(s.description ?? '');
        setDropInPrice(
          s.dropInPrice != null ? String(s.dropInPrice) : '',
        );
        setActive(s.active);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el servicio',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service) {
      return;
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updateService(serviceId, {
        name: name.trim(),
        description: description.trim() || null,
        active,
        dropInPrice:
          service.type === 'POR_SESIONES'
            ? dropInPrice.trim()
              ? Number(dropInPrice)
              : null
            : undefined,
      });
      setService(updated);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar el servicio',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title={service?.name ?? 'Servicio'}
      actions={
        <Link href="/servicios" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!service && !loadError ? <p className="muted">Cargando…</p> : null}

      {service ? (
        <Panel title="Editar servicio" className="form-panel">
          <p className="muted small">
            Tipo: {formatServiceType(service.type)} (fijo)
          </p>
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
              Descripción
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>
            {service.type === 'POR_SESIONES' ? (
              <label>
                Precio drop-in (ARS)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={dropInPrice}
                  onChange={(e) => setDropInPrice(e.target.value)}
                  placeholder="Vacío = sin drop-in"
                />
              </label>
            ) : null}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activo
            </label>

            {saveError ? <p className="error">{saveError}</p> : null}
            {saveOk ? <p className="ok-msg">Guardado.</p> : null}

            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        </Panel>
      ) : null}
    </AdminShell>
  );
}
