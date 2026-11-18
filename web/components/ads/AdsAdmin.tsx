'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { listAdCampaigns, saveAdCampaign, AD_PLACEMENTS, type AdCampaign, type AdPlacement, type SaveAdCampaign } from '@/lib/api/ads';

const labels: Record<AdPlacement, string> = { MEMBER_PORTAL: 'Portal de socios', DASHBOARD: 'Dashboard del gimnasio', GYM_SITE: 'Página pública' };
const localTime = (value: string) => new Date(value).toISOString().slice(0, 16);

function Campaigns() {
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placements, setPlacements] = useState<AdPlacement[]>([...AD_PLACEMENTS]);
  const [form, setForm] = useState({
    name: '', body: '', imageUrl: '', targetUrl: '',
    startsAt: localTime(new Date().toISOString()),
    endsAt: localTime(new Date(Date.now() + 30 * 86400000).toISOString()),
  });
  async function reload() {
    try { setItems(await listAdCampaigns()); } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar campañas'); }
  }
  useEffect(() => { void reload(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data: SaveAdCampaign = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), active: true, placements };
      await saveAdCampaign(data); setForm({ ...form, name: '', body: '', imageUrl: '', targetUrl: '' }); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }
  async function toggle(item: AdCampaign) {
    setError('');
    try { await saveAdCampaign({ name: item.name, body: item.body, imageUrl: item.imageUrl, targetUrl: item.targetUrl, startsAt: item.startsAt, endsAt: item.endsAt, active: !item.active, placements: item.placements }, item.id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); }
  }
  return (
    <AdminShell title="Faciliter Ads" subtitle={<p>Campañas globales · impresiones y clics</p>}>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: '.75rem', padding: '1rem' }}>
        <h2>Nueva campaña</h2>
        <label>Nombre<input required minLength={2} maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Texto<input required minLength={2} maxLength={300} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></label>
        <label>Imagen (URL HTTPS)<input type="url" required value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></label>
        <label>Destino (URL)<input type="url" required value={form.targetUrl} onChange={e => setForm({ ...form, targetUrl: e.target.value })} /></label>
        <label>Desde<input type="datetime-local" required value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} /></label>
        <label>Hasta<input type="datetime-local" required value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} /></label>
        <fieldset><legend>Ubicaciones</legend>{AD_PLACEMENTS.map(place => <label key={place} style={{ display: 'block' }}><input type="checkbox" checked={placements.includes(place)} onChange={e => setPlacements(e.target.checked ? [...placements, place] : placements.filter(p => p !== place))} /> {labels[place]}</label>)}</fieldset>
        <button className="btn primary" disabled={busy || placements.length === 0}>{busy ? 'Guardando…' : 'Crear campaña'}</button>
      </form>
      <section className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <h2>Campañas</h2>
        {items.map(item => <article key={item.id} style={{ padding: '.75rem 0', borderBottom: '1px solid var(--border)' }}>
          <strong>{item.name}</strong> · {item.active ? 'Activa' : 'Pausada'}<p>{item.body}</p>
          <p className="muted small">{item.impressions} impresiones · {item.clicks} clics · {item.placements.map(p => labels[p]).join(', ')}</p>
          <button className="btn ghost" type="button" onClick={() => void toggle(item)}>{item.active ? 'Pausar' : 'Activar'}</button>
        </article>)}
        {!items.length ? <p className="muted">Todavía no hay campañas.</p> : null}
      </section>
    </AdminShell>
  );
}

export function AdsAdmin() {
  return <RequireStaff><Campaigns /></RequireStaff>;
}
