'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { getPack, updatePack } from '@/lib/api/packs';
import type { PackComponentInput, PackDetail } from '@/lib/api/packs';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { formatPackKind, formatServiceType } from '@/lib/catalog-labels';

type ComponentDraft = {
  key: string;
  serviceId: string;
  creditAmount: string;
};

/**
 * Edición de pack; components reemplaza el set completo (CU-SER-002).
 */
export default function PackDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const packId = String(params.id);

  const [pack, setPack] = useState<PackDetail | null>(null);
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ONE_TIME'>(
    'MONTHLY',
  );
  const [active, setActive] = useState(true);
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, svcs] = await Promise.all([
          getPack(packId),
          listServices({ active: true }),
        ]);
        if (cancelled) {
          return;
        }
        setPack(p);
        setServices(svcs);
        setName(p.name);
        setDescription(p.description ?? '');
        setPrice(String(p.price));
        setBillingPeriod(p.billingPeriod);
        setActive(p.active);
        setComponents(
          p.components.map((c, i) => ({
            key: `c${i}`,
            serviceId: c.serviceId,
            creditAmount:
              c.creditAmount != null ? String(c.creditAmount) : '',
          })),
        );
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

  function serviceById(id: string): ServiceDetail | undefined {
    return services.find((s) => s.id === id);
  }

  function buildComponents(): PackComponentInput[] {
    return components
      .filter((c) => c.serviceId)
      .map((c) => {
        const svc = serviceById(c.serviceId);
        if (svc?.type === 'POR_SESIONES') {
          return {
            serviceId: c.serviceId,
            creditAmount: Number(c.creditAmount),
          };
        }
        return { serviceId: c.serviceId };
      });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const comps = buildComponents();
    if (comps.length === 0) {
      setSaveError('Agregá al menos un servicio');
      return;
    }
    for (const c of comps) {
      const svc = serviceById(c.serviceId);
      if (
        svc?.type === 'POR_SESIONES' &&
        (c.creditAmount === undefined || c.creditAmount < 1)
      ) {
        setSaveError(`«${svc.name}» requiere créditos ≥ 1`);
        return;
      }
    }
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await updatePack(packId, {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        billingPeriod,
        active,
        components: comps,
      });
      setPack(updated);
      setSaveOk(true);
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

  return (
    <AdminShell
      title={pack?.name ?? 'Pack'}
      actions={
        <Link href="/packs" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!pack && !loadError ? <p className="muted">Cargando…</p> : null}

      {pack ? (
        <Panel title="Editar pack" className="form-panel">
          <p className="muted small">
            Tipo calculado: {formatPackKind(pack.kind)}
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
                rows={2}
              />
            </label>
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
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activo
            </label>

            <fieldset className="pack-components">
              <legend>Componentes</legend>
              <p className="muted small">
                Al guardar se reemplaza el set completo.
              </p>
              {components.map((c, idx) => {
                const svc = serviceById(c.serviceId);
                return (
                  <div key={c.key} className="pack-component-row">
                    <label>
                      Servicio
                      <select
                        value={c.serviceId}
                        onChange={(e) => {
                          const next = [...components];
                          next[idx] = {
                            ...c,
                            serviceId: e.target.value,
                            creditAmount: '',
                          };
                          setComponents(next);
                        }}
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
                    {svc?.type === 'POR_SESIONES' ? (
                      <label>
                        Créditos
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={c.creditAmount}
                          onChange={(e) => {
                            const next = [...components];
                            next[idx] = {
                              ...c,
                              creditAmount: e.target.value,
                            };
                            setComponents(next);
                          }}
                          required
                        />
                      </label>
                    ) : null}
                    {components.length > 1 ? (
                      <button
                        type="button"
                        className="linkish"
                        onClick={() =>
                          setComponents(
                            components.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  setComponents([
                    ...components,
                    {
                      key: `c${Date.now()}`,
                      serviceId: '',
                      creditAmount: '',
                    },
                  ])
                }
              >
                + Agregar servicio
              </button>
            </fieldset>

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
