'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import {
  AD_PLACEMENTS,
  listAdCampaigns,
  saveAdCampaign,
  type AdCampaign,
  type AdPlacement,
  type SaveAdCampaign,
} from '@/lib/api/ads';

const labels: Record<AdPlacement, string> = {
  MEMBER_PORTAL: 'Portal de socios',
  DASHBOARD: 'Dashboard del gimnasio',
  GYM_SITE: 'Página pública',
};
const localTime = (value: string) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function Campaigns() {
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [placements, setPlacements] = useState<AdPlacement[]>([...AD_PLACEMENTS]);
  const [form, setForm] = useState({
    name: '',
    body: '',
    imageUrl: '',
    targetUrl: '',
    startsAt: localTime(new Date().toISOString()),
    endsAt: localTime(
      new Date(new Date().getTime() + 30 * 86400000).toISOString(),
    ),
  });

  async function reload() {
    try {
      setItems(await listAdCampaigns());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar campañas');
    }
  }

  useEffect(() => {
    void listAdCampaigns()
      .then(setItems)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar campañas');
      });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data: SaveAdCampaign = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: true,
        placements,
      };
      await saveAdCampaign(data);
      setForm({ ...form, name: '', body: '', imageUrl: '', targetUrl: '' });
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: AdCampaign) {
    setError('');
    try {
      await saveAdCampaign(
        {
          name: item.name,
          body: item.body,
          imageUrl: item.imageUrl,
          targetUrl: item.targetUrl,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          active: !item.active,
          placements: item.placements,
        },
        item.id,
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  return (
    <AdminShell
      title="Faciliter Ads"
      subtitle={<p>Campañas globales · impresiones y clics</p>}
      actions={
        <button
          type="button"
          className="btn"
          onClick={() => setModalOpen(true)}
        >
          + Nueva campaña
        </button>
      }
    >
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <h2>Campañas</h2>
      {items.length ? (
        <AdminGrid>
          {items.map((item) => (
            <Panel
              key={item.id}
              title={item.name}
              description={item.active ? 'Activa' : 'Pausada'}
            >
              <p>{item.body}</p>
              <p className="muted small">
                {item.impressions} impresiones · {item.clicks} clics
              </p>
              <p className="muted small">
                {item.placements.map((place) => labels[place]).join(' · ')}
              </p>
              <p className="muted small">
                {new Date(item.startsAt).toLocaleDateString('es-AR')} –{' '}
                {new Date(item.endsAt).toLocaleDateString('es-AR')}
              </p>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void toggle(item)}
              >
                {item.active ? 'Pausar' : 'Activar'}
              </button>
            </Panel>
          ))}
        </AdminGrid>
      ) : (
        <Panel>
          <p className="muted">Todavía no hay campañas.</p>
        </Panel>
      )}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva campaña"
        description="Campaña global de Faciliter Ads."
        size="wide"
      >
        <form className="admin-form" onSubmit={submit}>
          <AdminGrid>
            <label>
              Nombre
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Texto
              <input
                required
                minLength={2}
                maxLength={300}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label>
              Imagen (URL HTTPS)
              <input
                type="url"
                required
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </label>
            <label>
              Destino (URL)
              <input
                type="url"
                required
                value={form.targetUrl}
                onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              />
            </label>
            <label>
              Desde
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label>
              Hasta
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </AdminGrid>
          <fieldset className="perm-checklist">
            <legend>Ubicaciones</legend>
            {AD_PLACEMENTS.map((place) => (
              <label key={place} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={placements.includes(place)}
                  onChange={(e) =>
                    setPlacements(
                      e.target.checked
                        ? [...placements, place]
                        : placements.filter((p) => p !== place),
                    )
                  }
                />
                {labels[place]}
              </label>
            ))}
          </fieldset>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="admin-modal-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setModalOpen(false)}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={busy || placements.length === 0}
            >
              {busy ? 'Guardando…' : 'Crear campaña'}
            </button>
          </div>
        </form>
      </AdminModal>
    </AdminShell>
  );
}

export function AdsAdmin() {
  return (
    <RequireStaff>
      <Campaigns />
    </RequireStaff>
  );
}
