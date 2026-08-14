'use client';

import type { PackComponentInput } from '@/lib/api/packs';
import type { ServiceDetail } from '@/lib/api/services';
import { formatServiceType } from '@/lib/catalog-labels';

export type PackComponentDraft = {
  key: string;
  serviceId: string;
  creditAmount: string;
};

/**
 * Convierte drafts del editor a DTO de componentes de pack.
 */
export function buildPackComponents(
  components: PackComponentDraft[],
  services: ServiceDetail[],
): PackComponentInput[] {
  return components
    .filter((c) => c.serviceId)
    .map((c) => {
      const svc = services.find((s) => s.id === c.serviceId);
      if (svc?.type === 'POR_SESIONES') {
        return {
          serviceId: c.serviceId,
          creditAmount: Number(c.creditAmount),
        };
      }
      return { serviceId: c.serviceId };
    });
}

/**
 * Fieldset compartido de componentes de pack (alta / edición).
 */
export function PackComponentsEditor({
  components,
  onChange,
  services,
  hint,
}: {
  components: PackComponentDraft[];
  onChange: (next: PackComponentDraft[]) => void;
  services: ServiceDetail[];
  hint: string;
}) {
  return (
    <fieldset className="pack-components">
      <legend>Componentes</legend>
      <p className="muted small">{hint}</p>
      {components.map((c, idx) => {
        const svc = services.find((s) => s.id === c.serviceId);
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
                  onChange(next);
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
                    onChange(next);
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
                  onChange(components.filter((_, i) => i !== idx))
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
          onChange([
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
  );
}
