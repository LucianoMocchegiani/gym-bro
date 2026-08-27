'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  PackComponentsEditor,
  buildPackComponents,
  type PackComponentDraft,
} from '@/components/PackComponentsEditor';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageUpload, uploadImageToApi } from '@/components/ImageUpload';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { getPack, updatePack } from '@/lib/api/packs';
import type { PackDetail } from '@/lib/api/packs';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { formatPackKind } from '@/lib/catalog-labels';

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function kuatiaStatus(pack: PackDetail): {
  label: string;
  tone: 'ok' | 'error' | 'muted';
} {
  if (pack.kuatiaLastError) {
    return { label: 'Error de sync', tone: 'error' };
  }
  if (pack.kuatiaSyncedAt) {
    return { label: 'Sincronizado', tone: 'ok' };
  }
  if (pack.kuatiaConfigurationId) {
    return { label: 'Configurada (sin timestamp)', tone: 'muted' };
  }
  return { label: 'Sin sync aún', tone: 'muted' };
}

/**
 * Edición de pack + sync Kuatia (CU-SER-002).
 */
export function PackEditPanel({
  packId,
  onSaved,
  onCancel,
}: {
  packId: string;
  onSaved?: (pack: PackDetail) => void;
  /** Si el form se renderiza en un modal: cierra al guardar sin cambios. */
  onCancel?: () => void;
}) {
  const [pack, setPack] = useState<PackDetail | null>(null);
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
  const [active, setActive] = useState(true);
  const [components, setComponents] = useState<PackComponentDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [initialJson, setInitialJson] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, svcs] = await Promise.all([
          getPack(packId),
          listServices({ active: true, pageSize: 100 }),
        ]);
        if (cancelled) {
          return;
        }
        applyPack(p);
        setServices(svcs.items);
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el pack',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  function applyPack(p: PackDetail) {
    setPack(p);
    setName(p.name);
    setDescription(p.description ?? '');
    setImageUrl(p.imageUrl ?? null);
    setPrice(String(p.price));
    setBillingPeriod(p.billingPeriod);
    setCreditsExpireAt(toDateInput(p.creditsExpireAt));
    setActive(p.active);
    const comps = p.components.map((c, i) => ({
      key: `c${i}`,
      serviceId: c.serviceId,
      creditAmount: c.creditAmount != null ? String(c.creditAmount) : '',
    }));
    setComponents(comps);
    setInitialJson(
      JSON.stringify({
        name: p.name,
        description: p.description ?? '',
        price: String(p.price),
        billingPeriod: p.billingPeriod,
        creditsExpireAt: toDateInput(p.creditsExpireAt),
        active: p.active,
        components: comps,
      }),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const comps = buildPackComponents(components, services);
    if (comps.length === 0) {
      setSaveError('Agregá al menos un servicio');
      return;
    }
    for (const c of comps) {
      const svc = services.find((s) => s.id === c.serviceId);
      if (
        svc?.type === 'POR_SESIONES' &&
        (c.creditAmount === undefined || c.creditAmount < 1)
      ) {
        setSaveError(`«${svc.name}» requiere créditos ≥ 1`);
        return;
      }
    }
    const dirty =
      initialJson !== '' &&
      JSON.stringify({
        name,
        description,
        imageUrl: imageUrl ?? '',
        price,
        billingPeriod,
        creditsExpireAt,
        active,
        components,
      }) !== initialJson;
    if (!dirty) {
      // Sin cambios: no pegarle a la API; si es modal, cerrar.
      onCancel?.();
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    const comps = buildPackComponents(components, services);
    setBusy(true);
    setSaveError(null);
    setImageWarning(null);
    setSaveOk(false);
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
      const updated = await updatePack(packId, {
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: finalImageUrl ?? null,
        price: Number(price),
        billingPeriod,
        creditsExpireAt:
          billingPeriod === 'MONTHLY'
            ? null
            : creditsExpireAt
              ? `${creditsExpireAt}T23:59:59.999Z`
              : null,
        active,
        components: comps,
      });
      applyPack(updated);
      setSaveOk(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar el pack',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="error">{loadError}</p>;
  }
  if (!pack) {
    return <SkeletonForm fields={4} />;
  }

  const kuatia = kuatiaStatus(pack);

  return (
    <div className="admin-stack">
      <p className="muted small">Tipo calculado: {formatPackKind(pack.kind)}</p>
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
            renovación). Al guardar se limpia cualquier fecha fija de catálogo.
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
              Opcional. Vacío = +1 mes desde el alta. Si cargás fecha, los
              créditos vencen ese día. Vaciar y guardar limpia el valor.
            </p>
          </>
        )}
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Activo
        </label>

        <PackComponentsEditor
          components={components}
          onChange={setComponents}
          services={services}
          hint="Al guardar se reemplaza el set completo."
        />

        {imageWarning ? <p className="warn">{imageWarning}</p> : null}
        {saveError ? <p className="error">{saveError}</p> : null}
        {saveOk ? <p className="ok-msg">Guardado.</p> : null}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios del pack? Se re-sincroniza la metadata en Kuatia."
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => {
          setConfirmSave(false);
          void doSave();
        }}
        onCancel={() => setConfirmSave(false)}
      />

      <div className="admin-stack">
        <p className="muted small">
          Sync Kuatia:{' '}
          <span
            className={
              kuatia.tone === 'error'
                ? 'error'
                : kuatia.tone === 'ok'
                  ? 'ok-msg'
                  : 'muted'
            }
          >
            {kuatia.label}
          </span>
        </p>
        <dl className="detail-dl">
          <div>
            <dt>Configuration ID</dt>
            <dd>
              <code>{pack.kuatiaConfigurationId ?? '—'}</code>
            </dd>
          </div>
          <div>
            <dt>VCT</dt>
            <dd>
              <code>{pack.kuatiaVct ?? '—'}</code>
            </dd>
          </div>
          <div>
            <dt>Última sync</dt>
            <dd>{formatWhen(pack.kuatiaSyncedAt)}</dd>
          </div>
          <div>
            <dt>Último error</dt>
            <dd>
              {pack.kuatiaLastError ? (
                <span className="error">{pack.kuatiaLastError}</span>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        <p className="muted small">
          Se actualiza al crear o guardar el pack. No hay re-sync manual en este
          corte.
        </p>
      </div>
    </div>
  );
}
