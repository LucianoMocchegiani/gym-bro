'use client';

import { useEffect, useRef, useState } from 'react';
import { getAd, trackAd, type AdPlacement, type AdCreative } from '@/lib/api/ads';
import { platformOrigin } from '@/lib/tenant-host';

export function AdSlot({ tenantSlug, placement }: { tenantSlug: string; placement: AdPlacement }) {
  const [ad, setAd] = useState<AdCreative | null>(null);
  const tracked = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void getAd(tenantSlug, placement).then((next) => {
      if (!cancelled) setAd(next);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [tenantSlug, placement]);
  useEffect(() => {
    if (ad && !tracked.current) {
      tracked.current = true;
      void trackAd(tenantSlug, ad.id, placement, 'IMPRESSION').catch(() => undefined);
    }
  }, [ad, tenantSlug, placement]);

  const fallback = !ad;
  const href = ad?.targetUrl ?? platformOrigin();
  return (
    <aside className="mkt-inner mkt-section" aria-label="Publicidad">
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => {
        if (ad) void trackAd(tenantSlug, ad.id, placement, 'CLICK').catch(() => undefined);
      }} style={{ display: 'flex', gap: '1rem', alignItems: 'center', textDecoration: 'none' }}>
        {ad?.imageUrl ? <img src={ad.imageUrl} alt="" loading="lazy" style={{ width: 120, maxHeight: 90, objectFit: 'cover' }} /> : null}
        <span>
          <span className="eyebrow">Publicidad</span>
          <strong style={{ display: 'block' }}>{ad?.name ?? 'Conocé Faciliter'}</strong>
          <span>{ad?.body ?? 'Herramientas simples para gestionar tu gimnasio.'}</span>
        </span>
      </a>
    </aside>
  );
}
