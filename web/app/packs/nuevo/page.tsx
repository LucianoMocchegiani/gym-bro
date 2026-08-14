'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { createPack } from '@/lib/api/packs';
import type { PackComponentInput } from '@/lib/api/packs';
import { listServices } from '@/lib/api/services';
import type { ServiceDetail } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';

type ComponentDraft = {
  key: string;
  serviceId: string;
  creditAmount: string;
};

/**
 * Alta de pack con componentes (CU-SER-002).
 */
export default function NuevoPackPage() {
  return (
    <RequireStaff>
      <NuevoInner />
    </RequireStaff>
  );
}

function NuevoInner() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ONE_TIME'>(
    'MONTHLY',
  );
  const [creditsExpireAt, setCreditsExpireAt] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([
    { key: 'c0', serviceId: '', creditAmount: '' },
  ]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listServices({ active: true, pageSize: 100 });
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
      setError('Agregá al menos un servicio');
      return;
    }
    for (const c of comps) {
      const svc = serviceById(c.serviceId);
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
    try {
      const created = await createPack({
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        billingPeriod,
        creditsExpireAt:
          billingPeriod === 'ONE_TIME' && creditsExpireAt
            ? `${creditsExpireAt}T23:59:59.999Z`
            : undefined,
        components: comps,
      });
      router.replace(`/packs/${created.id}`);
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

  return (
    <AdminShell
      title="Nuevo pack"
      actions={
        <Link href="/packs" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}

      <Panel title="Datos del pack" className="form-panel">
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
          {billingPeriod === 'MONTHLY' ? (
            <p className="muted small">
              Pack mensual: los créditos vencen con el mes del contrato (+1 mes
              / renovación). No se usa fecha fija de catálogo.
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
                Opcional. Vacío = +1 mes desde el alta del contrato. Si
                cargás fecha, los créditos de sesiones vencen ese día.
              </p>
            </>
          )}

          <fieldset className="pack-components">
            <legend>Componentes</legend>
            <p className="muted small">
              Acceso libre: sin créditos. Por sesiones: indicar cantidad.
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
                        setComponents(components.filter((_, i) => i !== idx))
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

          {error ? <p className="error">{error}</p> : null}

          <button
            type="submit"
            className="primary"
            disabled={busy || !!loadError}
          >
            {busy ? 'Guardando…' : 'Crear pack'}
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
