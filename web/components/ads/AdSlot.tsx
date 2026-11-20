'use client';

import { useEffect, useRef, useState } from 'react';
import { getAds, trackAd, type AdCreative, type AdPlacement } from '@/lib/api/ads';
import { platformOrigin } from '@/lib/tenant-host';

export function AdSlot({ tenantSlug, placement }: { tenantSlug: string; placement: AdPlacement }) {
  const [ads, setAds] = useState<AdCreative[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [step, setStep] = useState(0);
  const [displayKey, setDisplayKey] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const carousel = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | null>(null);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    void getAds(tenantSlug, placement)
      .then((next) => {
        if (!cancelled) {
          setAds(next);
          setStartIndex(0);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, placement]);

  useEffect(() => {
    const element = carousel.current;
    const windowElement = element?.querySelector<HTMLElement>('.ad-slot-window');
    const card = windowElement?.querySelector<HTMLElement>('.ad-slot-card');
    if (!element || !windowElement || !card) return;
    const updateLayout = () => {
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      const cardWidth = card.getBoundingClientRect().width;
      setStep(cardWidth + gap);
      setVisibleCount(Math.max(1, Math.floor((windowElement.clientWidth + gap) / (cardWidth + gap))));
    };
    const observer = new ResizeObserver(updateLayout);
    observer.observe(windowElement);
    updateLayout();
    return () => observer.disconnect();
  }, [ads.length]);

  const hasMoreAds = ads.length > visibleCount;

  useEffect(() => {
    const visibleAds = hasMoreAds
      ? Array.from({ length: visibleCount }, (_, i) => ads[(startIndex + i + ads.length) % ads.length]).filter(Boolean)
      : ads;
    for (const ad of visibleAds) {
      const key = `${tenantSlug}:${placement}:${ad.id}:${displayKey}`;
      if (!tracked.current.has(key)) {
        tracked.current.add(key);
        void trackAd(tenantSlug, ad.id, placement, 'IMPRESSION').catch(() => undefined);
      }
    }
  }, [ads, displayKey, startIndex, tenantSlug, placement, visibleCount, hasMoreAds]);

  useEffect(() => {
    if (!rotationEnabled || hovered || !hasMoreAds) return;
    const timer = window.setInterval(() => {
      setStartIndex((index) => index + 1);
      setDisplayKey((key) => key + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [hasMoreAds, hovered, rotationEnabled]);

  useEffect(() => () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  }, []);

  const showAd = (direction: -1 | 1) => {
    setStartIndex((index) => index + direction);
    setDisplayKey((key) => key + 1);
    setRotationEnabled(false);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      setRotationEnabled(true);
      resumeTimer.current = null;
    }, 6000);
  };

  const resetLoop = () => {
    if (startIndex >= ads.length) {
      setTransitionEnabled(false);
      setStartIndex(0);
      requestAnimationFrame(() => setTransitionEnabled(true));
    } else if (startIndex < 0) {
      setTransitionEnabled(false);
      setStartIndex(ads.length - 1);
      requestAnimationFrame(() => setTransitionEnabled(true));
    }
  };

  const trackAds = hasMoreAds
    ? [...ads.slice(-visibleCount), ...ads, ...ads.slice(0, visibleCount)]
    : ads;
  const trackOffset = hasMoreAds ? visibleCount + startIndex : 0;

  return (
    <aside
      className="mkt-inner mkt-section"
      aria-label="Publicidad"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={carousel}
        className="ad-slot-carousel"
        role="group"
        aria-roledescription="carrusel"
        aria-live={rotationEnabled && !hovered ? 'off' : 'polite'}
      >
        <div className="ad-slot-window">
          <div
            className="ad-slot-track"
            style={{
              gap: '0.75rem',
              transform: `translateX(-${trackOffset * step}px)`,
              transition: transitionEnabled ? 'transform 500ms ease' : 'none',
            }}
            onTransitionEnd={resetLoop}
          >
            {(trackAds.length ? trackAds : [null]).map((ad, index) => (
              <a
                key={`${ad?.id ?? 'fallback'}-${index}`}
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
          </div>
        </div>
        {hasMoreAds ? (
          <div className="ad-slot-controls" aria-label="Controles de publicidad">
            <button type="button" aria-label="Anuncio anterior" onClick={() => showAd(-1)}>‹</button>
            <button type="button" aria-label="Anuncio siguiente" onClick={() => showAd(1)}>›</button>
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .ad-slot-carousel {
          position: relative;
          display: grid;
          gap: 0.75rem;
          padding-inline: 3.25rem;
        }
        .ad-slot-window {
          overflow: hidden;
        }
        .ad-slot-track {
          display: flex;
          width: max-content;
        }
        .ad-slot-card {
          display: flex;
          width: min(100%, 18rem);
          min-width: 0;
          flex: 0 0 auto;
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
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .ad-slot-controls button {
          position: absolute;
          top: 50%;
          display: grid;
          place-items: center;
          width: 2.5rem;
          height: 2.5rem;
          min-width: 2.5rem;
          min-height: 2.5rem;
          padding: 0;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--panel-bg);
          color: inherit;
          cursor: pointer;
          pointer-events: auto;
          transform: translateY(-50%);
        }
        .ad-slot-controls button:first-child {
          left: 0.5rem;
        }
        .ad-slot-controls button:last-child {
          right: 0.5rem;
        }
        @media (max-width: 640px) {
          .ad-slot-carousel {
            padding-inline: 2.75rem;
          }
          .ad-slot-controls button:first-child {
            left: 0.125rem;
          }
          .ad-slot-controls button:last-child {
            right: 0.125rem;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad-slot-track {
            transition: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
