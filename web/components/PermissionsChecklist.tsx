'use client';

import { PERMISSION_OPTIONS } from '@/lib/permission-catalog';

type PermissionsChecklistProps = {
  selected: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
};

/**
 * Checklist de permisos del catálogo MVP (flags peligrosos marcados).
 */
export function PermissionsChecklist({
  selected,
  onChange,
  disabled,
}: PermissionsChecklistProps) {
  const set = new Set(selected);

  function toggle(code: string) {
    const next = new Set(set);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange([...next]);
  }

  return (
    <fieldset className="perm-checklist" disabled={disabled}>
      <legend>Permisos</legend>
      <div className="perm-list">
        {PERMISSION_OPTIONS.map((p) => (
          <label key={p.code} className="checkbox-row">
            <input
              type="checkbox"
              checked={set.has(p.code)}
              onChange={() => toggle(p.code)}
            />
            <span>
              {p.description}
              {p.dangerous ? (
                <span className="status-pill suspended"> peligroso</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
