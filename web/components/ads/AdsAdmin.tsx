'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { DataTable, listCountDescription } from '@/components/AdminList';
import { AdminGrid } from '@/components/AdminUi';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import {
  IconEdit,
  IconView,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import { StatusPill, activeTone } from '@/components/StatusPill';
import {
  AD_PLACEMENTS,
  listAdCampaigns,
  saveAdCampaign,
  type AdCampaign,
  type AdPlacement,
  type SaveAdCampaign,
} from '@/lib/api/ads';
import type { ListResult } from '@/lib/api/list';

const labels: Record<AdPlacement, string> = {
  MEMBER_PORTAL: 'Portal de socios',
  DASHBOARD: 'Dashboard del gimnasio',
  GYM_SITE: 'Página pública',
};
type CampaignForm = Omit<SaveAdCampaign, 'active' | 'placements'>;

const emptyForm = (): CampaignForm => ({
  name: '',
  body: '',
  imageUrl: '',
  targetUrl: '',
  startsAt: '',
  endsAt: '',
});
const localTime = (value: string) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 5h4v14H7zm6 0h4v14h-4z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}

function Campaigns() {
  const [result, setResult] = useState<ListResult<AdCampaign>>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  });
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(
    null,
  );
  const [selected, setSelected] = useState<AdCampaign | null>(null);
  const [placements, setPlacements] = useState<AdPlacement[]>([...AD_PLACEMENTS]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);

  useEffect(() => {
    let cancelled = false;
    listAdCampaigns({ page, pageSize: result.pageSize })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error al cargar campañas',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, refresh, result.pageSize]);

  function reload(firstPage = false) {
    setError(null);
    setLoading(true);
    if (firstPage) setPage(1);
    setRefresh((value) => value + 1);
  }

  function openCreate() {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86400000);
    setSelected(null);
    setForm({
      ...emptyForm(),
      startsAt: localTime(now.toISOString()),
      endsAt: localTime(end.toISOString()),
    });
    setPlacements([...AD_PLACEMENTS]);
    setModalMode('create');
  }

  function openEdit(item: AdCampaign) {
    setSelected(item);
    setForm({
      name: item.name,
      body: item.body,
      imageUrl: item.imageUrl,
      targetUrl: item.targetUrl,
      startsAt: localTime(item.startsAt),
      endsAt: localTime(item.endsAt),
    });
    setPlacements(item.placements);
    setModalMode('edit');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data: SaveAdCampaign = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: selected?.active ?? true,
        placements,
      };
      await saveAdCampaign(data, selected?.id);
      setModalMode(null);
      setSelected(null);
      reload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: AdCampaign) {
    setError(null);
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
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  function closeModal() {
    if (busy) return;
    setModalMode(null);
    setSelected(null);
  }

  return (
    <AdminShell
      title="Faciliter Ads"
      subtitle={<p>Campañas globales · impresiones y clics</p>}
      actions={
        <button type="button" className="btn" onClick={openCreate}>
          + Nueva campaña
        </button>
      }
    >
      <DataTable
        title="Campañas"
        description={listCountDescription(
          result.total,
          result.page,
          'campaña',
          'campañas',
        )}
        loading={loading}
        error={error}
        isEmpty={result.items.length === 0}
        emptyText="Todavía no hay campañas."
        page={result.page}
        hasMore={result.hasMore}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        header={
          <>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Vigencia</th>
            <th>Impresiones</th>
            <th>Clics</th>
            <th />
          </>
        }
      >
        {result.items.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>
              <StatusPill tone={activeTone(item.active)}>
                {item.active ? 'Activa' : 'Pausada'}
              </StatusPill>
            </td>
            <td>
              {new Date(item.startsAt).toLocaleDateString('es-AR')} –{' '}
              {new Date(item.endsAt).toLocaleDateString('es-AR')}
            </td>
            <td>{item.impressions}</td>
            <td>{item.clicks}</td>
            <td>
              <RowActions>
                <RowIconButton
                  label="Ver detalles"
                  onClick={() => {
                    setSelected(item);
                    setModalMode('view');
                  }}
                >
                  <IconView />
                </RowIconButton>
                <RowIconButton
                  label="Editar campaña"
                  onClick={() => openEdit(item)}
                >
                  <IconEdit />
                </RowIconButton>
                <RowIconButton
                  label={item.active ? 'Pausar campaña' : 'Activar campaña'}
                  onClick={() => void toggle(item)}
                >
                  {item.active ? <PauseIcon /> : <PlayIcon />}
                </RowIconButton>
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={modalMode === 'view' && !!selected}
        onClose={closeModal}
        title={selected?.name ?? 'Detalle de campaña'}
        description="Detalle de la campaña."
        size="comfortable"
      >
        {selected ? (
          <dl className="detail-list">
            <dt>Estado</dt>
            <dd>{selected.active ? 'Activa' : 'Pausada'}</dd>
            <dt>Texto</dt>
            <dd>{selected.body}</dd>
            <dt>Ubicaciones</dt>
            <dd>{selected.placements.map((place) => labels[place]).join(' · ')}</dd>
            <dt>Vigencia</dt>
            <dd>
              {new Date(selected.startsAt).toLocaleString('es-AR')} –{' '}
              {new Date(selected.endsAt).toLocaleString('es-AR')}
            </dd>
            <dt>Imagen</dt>
            <dd>
              <a href={selected.imageUrl} target="_blank" rel="noreferrer">
                Abrir imagen
              </a>
            </dd>
            <dt>Destino</dt>
            <dd>
              <a href={selected.targetUrl} target="_blank" rel="noreferrer">
                Abrir destino
              </a>
            </dd>
            <dt>Impresiones</dt>
            <dd>{selected.impressions}</dd>
            <dt>Clics</dt>
            <dd>{selected.clicks}</dd>
          </dl>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'edit' ? 'Editar campaña' : 'Nueva campaña'}
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
              onClick={closeModal}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={busy || placements.length === 0}
            >
              {busy
                ? 'Guardando…'
                : modalMode === 'edit'
                  ? 'Guardar cambios'
                  : 'Crear campaña'}
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
