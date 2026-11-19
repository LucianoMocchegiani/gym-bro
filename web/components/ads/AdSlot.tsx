'use client';

import { useEffect, useRef, useState } from 'react';
import { getAds, trackAd, type AdCreative, type AdPlacement } from '@/lib/api/ads';
import { platformOrigin } from '@/lib/tenant-host';

export function AdSlot({ tenantSlug, placement }: { tenantSlug: string; placement: AdPlacement }) {
  const [ads, setAds] = useState<AdCreative[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayKey, setDisplayKey] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    void getAds(tenantSlug, placement)
      .then((next) => { if (!cancelled) { setAds(next); setActiveIndex(0); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [tenantSlug, placement]);

  const ad = ads[activeIndex];
  useEffect(() => {
    if (!ad) return;
    const key = `${tenantSlug}:${placement}:${ad.id}:${displayKey}`;
    if (!tracked.current.has(key)) {
      tracked.current.add(key);
      void trackAd(tenantSlug, ad.id, placement, 'IMPRESSION').catch(() => undefined);
    }
  }, [ad, displayKey, tenantSlug, placement]);

  useEffect(() => {
    if (!rotationEnabled || hovered || ads.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % ads.length);
      setDisplayKey((key) => key + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [ads.length, hovered, rotationEnabled]);

  const showAd = (index: number) => {
    setActiveIndex((index + ads.length) % ads.length);
    setDisplayKey((key) => key + 1);
    setRotationEnabled(false);
  };

  return (
    <aside className="mkt-inner mkt-section" aria-label="Publicidad" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setRotationEnabled(false)}>
      <div className="ad-slot-carousel" role="group" aria-roledescription="carrusel" aria-live={rotationEnabled && !hovered ? 'off' : 'polite'}>
        <a
          key={ad?.id ?? 'fallback'}
          className="ad-slot-card"
          href={ad?.targetUrl ?? platformOrigin()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ad ? `${ad.name}. ${ad.body}` : 'Conocé Faciliter. Herramientas simples para gestionar tu gimnasio.'}
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
        {ads.length > 1 ? (
          <div className="ad-slot-controls" aria-label="Controles de publicidad">
            <button type="button" aria-label="Anuncio anterior" onClick={() => showAd(activeIndex - 1)}>‹</button>
            <span aria-live="off">{activeIndex + 1} / {ads.length}</span>
            <button type="button" aria-label="Anuncio siguiente" onClick={() => showAd(activeIndex + 1)}>›</button>
            <button type="button" onClick={() => setRotationEnabled((enabled) => !enabled)}>
              {rotationEnabled ? 'Pausar' : 'Reanudar'} rotación
            </button>
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .ad-slot-carousel {
          display: grid;
          justify-items: center;
          gap: 0.75rem;
        }
        .ad-slot-card {
          display: flex;
          width: min(100%, 18rem);
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
        .ad-slot-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
        .ad-slot-controls button {
          min-width: 2.5rem;
          min-height: 2.5rem;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--panel-bg);
          color: inherit;
          cursor: pointer;
        }
      `}</style>
    </aside>
  );
}
