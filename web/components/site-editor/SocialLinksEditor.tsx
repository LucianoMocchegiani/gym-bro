'use client';

import { useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import { putTenantSite, type SiteSocialLinks, type TenantSiteDetail } from '@/lib/api/tenant-site';
import { draftFromContent, draftToContent } from './site-draft';

const SOCIALS = [
  ['facebook', 'Facebook'],
  ['x', 'X'],
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['whatsapp', 'WhatsApp'],
] as const satisfies ReadonlyArray<[keyof SiteSocialLinks, string]>;

export function SocialLinksEditor({ detail, canWrite, onSaved }: {
  detail: TenantSiteDetail;
  canWrite: boolean;
  onSaved: (detail: TenantSiteDetail) => void;
}) {
  const [links, setLinks] = useState<Record<keyof SiteSocialLinks, string>>(() => ({
    facebook: detail.content?.socialLinks?.facebook ?? '',
    x: detail.content?.socialLinks?.x ?? '',
    tiktok: detail.content?.socialLinks?.tiktok ?? '',
    instagram: detail.content?.socialLinks?.instagram ?? '',
    whatsapp: detail.content?.socialLinks?.whatsapp ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const draft = draftFromContent(detail.content);
      const socialLinks = Object.fromEntries(
        SOCIALS.map(([key]) => [key, links[key].trim() || null]),
      ) as SiteSocialLinks;
      const saved = await putTenantSite({
        ...draftToContent(draft, (image) => image.url),
        brandIcon: detail.content?.brandIcon ?? null,
        socialLinks,
      });
      onSaved(saved);
      setMessage('Redes sociales guardadas y publicadas.');
    } catch (err) {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : 'No se pudieron guardar las redes sociales');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Redes sociales" description="Se muestran en el pie de la web pública del gimnasio; dejá vacío lo que no uses.">
      <div className="admin-form">
        {SOCIALS.map(([key, label]) => (
          <label key={key}>
            {label} (URL)
            <input
              type="url"
              value={links[key]}
              maxLength={500}
              placeholder={key === 'whatsapp' ? 'https://wa.me/549…' : `https://${key === 'x' ? 'x' : key}.com/tugym`}
              disabled={!canWrite || busy}
              onChange={(e) => setLinks((current) => ({ ...current, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="ok-msg">{message}</p> : null}
      {canWrite ? (
        <div className="form-actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Guardando…' : 'Guardar redes'}
          </button>
        </div>
      ) : <p className="muted small">Solo lectura: necesitás el permiso de editar la configuración.</p>}
    </Panel>
  );
}
