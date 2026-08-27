'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  PackComponentsEditor,
  buildPackComponents,
  type PackComponentDraft,
} from '@/components/PackComponentsEditor';
import { ImageUpload, uploadImageToApi } from '@/components/ImageUpload';
import { ApiClientError } from '@/lib/api/client';
import { createPack } from '@/lib/api/packs';
import type { PackDetail } from '@/lib/api/packs';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';

/**
 * Alta de pack con componentes (CU-SER-002), usable en modal.
 */
export function PackCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (created: PackDetail) => void;
  onCancel?: () => void;
}) {
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ONE_TIME'>(
    'MONTHLY',
  );
  const [creditsExpireAt, setCreditsExpireAt] = useState('');
  const [components, setComponents] = useState<PackComponentDraft[]>([
    { key: 'c0', serviceId: '', creditAmount: '' },
  ]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listServices({ active: true, pageSize: 100 });
        if (cancelled) return;
        setServices(data.items);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar servicios',
        );
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const comps = buildPackComponents(components, services);
    if (comps.length === 0) {
      setError('Agregá al menos un servicio');
      return;
    }
    for (const c of comps) {
      const svc = services.find((s) => s.id === c.serviceId);
      if (
        svc?.type === 'POR_SESIONES' &&
        (c.creditAmount === undefined || c.creditAmount < 1)
      ) {
        setError(`«${svc.name}» requiere créditos ≥ 1`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    setImageWarning(null);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        try {
          finalImageUrl = await uploadImageToApi(imageFile, 'packs');
        } catch (imgErr) {
          finalImageUrl = null;
          setImageWarning(
            imgErr instanceof Error
              ? `Imagen no subida: ${imgErr.message}`
              : 'Imagen no subida',
          );
        }
      }
      const created = await createPack({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: finalImageUrl ?? undefined,
        price: Number(price),
        billingPeriod,
        creditsExpireAt:
          billingPeriod === 'ONE_TIME' && creditsExpireAt
            ? `${creditsExpireAt}T23:59:59.999Z`
            : undefined,
        components: comps,
      });
      onSuccess(created);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el pack',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
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
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </label>
      <ImageUpload
        value={imageUrl}
        onFileSelect={setImageFile}
        onClear={() => { setImageUrl(null); setImageFile(null); }}
        label="Imagen del pack"
      />
      <label>
        Precio (ARS)
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <label>
        Periodo de facturación
        <select
          value={billingPeriod}
          onChange={(e) =>
            setBillingPeriod(e.target.value as 'MONTHLY' | 'ONE_TIME')
          }
        >
          <option value="MONTHLY">Mensual</option>
          <option value="ONE_TIME">Único</option>
        </select>
      </label>
      {billingPeriod === 'MONTHLY' ? (
        <p className="muted small">
          Pack mensual: los créditos vencen con el mes del contrato (+1 mes /
          renovación). No se usa fecha fija de catálogo.
        </p>
      ) : (
        <>
          <label>
            Vencimiento de créditos
            <input
              type="date"
              value={creditsExpireAt}
              onChange={(e) => setCreditsExpireAt(e.target.value)}
            />
          </label>
          <p className="muted small">
            Opcional. Vacío = +1 mes desde el alta del contrato. Si cargás
            fecha, los créditos de sesiones vencen ese día.
          </p>
        </>
      )}

      <PackComponentsEditor
        components={components}
        onChange={setComponents}
        services={services}
        hint="Acceso libre: sin créditos. Por sesiones: indicar cantidad."
      />

      {imageWarning ? <p className="warn">{imageWarning}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="form-actions">
        {onCancel ? (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Crear pack'}
        </button>
      </div>
    </form>
  );
}
