'use client';

import { useEffect, useRef, useState } from 'react';
import { getAds, trackAd, type AdCreative, type AdPlacement } from '@/lib/api/ads';
import { platformOrigin } from '@/lib/tenant-host';

export function AdSlot({ tenantSlug, placement }: { tenantSlug: string; placement: AdPlacement }) {
  const [ads, setAds] = useState<AdCreative[]>([]);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    void getAds(tenantSlug, placement)
      .then((next) => { if (!cancelled) setAds(next); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [tenantSlug, placement]);

  useEffect(() => {
    for (const ad of ads) {
      const key = `${tenantSlug}:${placement}:${ad.id}`;
      if (!tracked.current.has(key)) {
        tracked.current.add(key);
        void trackAd(tenantSlug, ad.id, placement, 'IMPRESSION').catch(() => undefined);
      }
    }
  }, [ads, tenantSlug, placement]);

  const creatives: (AdCreative | null)[] = ads.length ? ads : [null];

  return (
    <aside className="mkt-inner mkt-section" aria-label="Publicidad">
      <div className="ad-slot-grid">
        {creatives.map((ad, index) => (
          <a
            key={ad?.id ?? `fallback-${index}`}
            className="ad-slot-card"
            href={ad?.targetUrl ?? platformOrigin()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (ad) void trackAd(tenantSlug, ad.id, placement, 'CLICK').catch(() => undefined);
            }}
          >
            {ad?.imageUrl ? <img src={ad.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
            <span>
              <span className="eyebrow">Publicidad</span>
              <strong>{ad?.name ?? 'Conocé Faciliter'}</strong>
              <span>{ad?.body ?? 'Herramientas simples para gestionar tu gimnasio.'}</span>
            </span>
          </a>
        ))}
      </div>
      <style jsx>{`
        .ad-slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
          gap: 1rem;
        }
        .ad-slot-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid var(--line);
          border-radius: 1rem;
          background: color-mix(in srgb, var(--panel-bg) 75%, transparent);
          text-decoration: none;
        }
        .ad-slot-card img {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          border-radius: 0.6rem;
        }
        .ad-slot-card > span {
          display: grid;
          align-content: start;
          gap: 0.35rem;
          min-width: 0;
        }
        .ad-slot-card strong,
        .ad-slot-card > span > span:last-child {
          overflow-wrap: anywhere;
        }
        .ad-slot-card > span > span:last-child {
          color: var(--muted);
          line-height: 1.45;
        }
      `}</style>
    </aside>
  );
}
