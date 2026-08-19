'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { getService, updateService } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';

/**
 * Formulario de edición de servicio (CU-SER-001). El tipo no se puede cambiar.
 */
export function ServiceEditForm({
  serviceId,
  onSuccess,
  onCancel,
}: {
  serviceId: string;
  onSuccess: (updated: ServiceDetail) => void;
  onCancel?: () => void;
}) {
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dropInPrice, setDropInPrice] = useState('');
  const [active, setActive] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

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
        setDropInPrice(s.dropInPrice != null ? String(s.dropInPrice) : '');
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
    const dirty =
      name !== service.name ||
      description !== (service.description ?? '') ||
      dropInPrice !==
        (service.dropInPrice != null ? String(service.dropInPrice) : '') ||
      active !== service.active;
    if (!dirty) {
      // Sin cambios: no pegarle a la API; si es modal, cerrar.
      onCancel?.();
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    if (!service) {
      return;
    }
    setBusy(true);
    setSaveError(null);
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
      onSuccess(updated);
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

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!service) {
    return <SkeletonForm fields={3} />;
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      <p className="muted small">
        Tipo: {formatServiceType(service.type)} (fijo)
      </p>
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
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios del servicio?"
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
