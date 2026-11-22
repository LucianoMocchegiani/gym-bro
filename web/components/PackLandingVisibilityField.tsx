'use client';

import { useEffect, useState } from 'react';
import {
  getPackLandingVisibility,
  updatePackLandingVisibility,
} from '@/lib/api/packs';
import { ApiClientError } from '@/lib/api/client';

export function PackLandingVisibilityField({ packId }: { packId: string }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPackLandingVisibility(packId)
      .then(({ showOnLanding }) => {
        if (!cancelled) setVisible(showOnLanding);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar la visibilidad del pack',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packId]);

  async function changeVisibility(showOnLanding: boolean) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePackLandingVisibility(packId, showOnLanding);
      setVisible(updated.showOnLanding);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo actualizar la visibilidad del pack',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-stack">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={visible}
          disabled={loading || saving}
          onChange={(event) => void changeVisibility(event.target.checked)}
        />
        Mostrar en la landing pública
      </label>
      {loading ? <p className="muted small">Cargando…</p> : null}
      {saving ? <p className="muted small">Guardando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted small">
        Si lo ocultás, el pack sigue activo y se puede contratar desde otros
        flujos.
      </p>
    </div>
  );
}
