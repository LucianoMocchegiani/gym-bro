'use client';

import { useEffect, useRef, useState } from 'react';
import { getAds, trackAd, type AdCreative, type AdPlacement } from '@/lib/api/ads';
import { platformOrigin } from '@/lib/tenant-host';

export function AdSlot({ tenantSlug, placement }: { tenantSlug: string; placement: AdPlacement }) {
  const [ads, setAds] = useState<AdCreative[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [displayKey, setDisplayKey] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const carousel = useRef<HTMLDivElement>(null);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    void getAds(tenantSlug, placement)
      .then((next) => { if (!cancelled) { setAds(next); setStartIndex(0); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [tenantSlug, placement]);

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    const updateVisibleCount = () => {
      const rem = parseFloat(getComputedStyle(element).fontSize);
      setVisibleCount(Math.max(1, Math.floor((element.clientWidth + rem * 0.75) / (rem * 18 + rem * 0.75))));
    };
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(element);
    updateVisibleCount();
    return () => observer.disconnect();
  }, []);

  const visibleAds = ads.slice(startIndex, startIndex + visibleCount);
  useEffect(() => {
    for (const ad of visibleAds) {
      const key = `${tenantSlug}:${placement}:${ad.id}:${displayKey}`;
      if (!tracked.current.has(key)) {
        tracked.current.add(key);
        void trackAd(tenantSlug, ad.id, placement, 'IMPRESSION').catch(() => undefined);
      }
    }
  }, [ads, displayKey, startIndex, tenantSlug, placement, visibleCount]);

  const hasMoreAds = ads.length > visibleCount;
  useEffect(() => {
    if (!rotationEnabled || hovered || !hasMoreAds) return;
    const timer = window.setInterval(() => {
      setStartIndex((index) => index + visibleCount >= ads.length ? 0 : index + visibleCount);
      setDisplayKey((key) => key + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [ads.length, hasMoreAds, hovered, rotationEnabled, visibleCount]);

  const showPage = (direction: -1 | 1) => {
    setStartIndex((index) => direction > 0
      ? (index + visibleCount >= ads.length ? 0 : index + visibleCount)
      : (index === 0 ? Math.floor((ads.length - 1) / visibleCount) * visibleCount : Math.max(0, index - visibleCount)));
    setDisplayKey((key) => key + 1);
    setRotationEnabled(false);
  };

  return (
    <aside className="mkt-inner mkt-section" aria-label="Publicidad" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setRotationEnabled(false)}>
      <div ref={carousel} className="ad-slot-carousel" role="group" aria-roledescription="carrusel" aria-live={rotationEnabled && !hovered ? 'off' : 'polite'} style={{ gridTemplateColumns: `repeat(${visibleAds.length || 1}, minmax(0, 18rem))` }}>
        {(visibleAds.length ? visibleAds : [null]).map((ad) => (
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
        ))}
        {hasMoreAds ? (
          <div className="ad-slot-controls" aria-label="Controles de publicidad">
            <button type="button" aria-label="Anuncios anteriores" onClick={() => showPage(-1)}>‹</button>
            <span aria-live="off">{Math.floor(startIndex / visibleCount) + 1} / {Math.ceil(ads.length / visibleCount)}</span>
            <button type="button" aria-label="Anuncios siguientes" onClick={() => showPage(1)}>›</button>
            <button type="button" onClick={() => setRotationEnabled((enabled) => !enabled)}>
              {rotationEnabled ? 'Pausar' : 'Reanudar'} rotación
            </button>
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .ad-slot-carousel {
          display: grid;
          justify-content: center;
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
          grid-column: 1 / -1;
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
