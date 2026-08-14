'use client';

import { FormEvent, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { createService } from '@/lib/api/services';
import type { ServiceDetail, ServiceType } from '@/lib/api/services';

/**
 * Formulario de alta de servicio (CU-SER-001), usable en página o modal.
 */
export function ServiceCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (created: ServiceDetail) => void;
  onCancel?: () => void;
}) {
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
      onSuccess(created);
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
          {busy ? 'Guardando…' : 'Crear servicio'}
        </button>
      </div>
    </form>
  );
}
