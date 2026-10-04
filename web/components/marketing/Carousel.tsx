'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type CarouselItem = {
  id: string;
  /** Nombre del slide para lectores de pantalla y los puntos. */
  label: string;
  content: ReactNode;
};

const ROTATE_MS = 6000;
const SWIPE_PX = 40;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Carrusel de la web pública (landing Faciliter y web del gym).
 *
 * @remarks Rota solo cada 6 s salvo con hover/foco o `prefers-reduced-motion`.
 * Todos los slides quedan en el HTML (SEO); los ocultos van `inert`. El
 * contenido llega armado (puede venir de un Server Component).
 */
export function Carousel({
  items,
  label,
  className = 'mkt-slider',
}: {
  items: CarouselItem[];
  label: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  const touchStartX = useRef<number | null>(null);
  const count = items.length;
  const current = count > 0 ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    if (paused || reducedMotion || count < 2) {
      return;
    }
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, count, index]);

  function go(next: number) {
    setIndex((next + count) % count);
  }

  return (
    <div
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null || Math.abs(end - start) < SWIPE_PX) {
          return;
        }
        go(current + (end < start ? 1 : -1));
      }}
    >
      <div className="mkt-slider-viewport">
        <div
          className="mkt-slider-track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              className="mkt-slider-item"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${count}: ${item.label}`}
              aria-hidden={i !== current}
              inert={i !== current}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>

      {count > 1 ? (
        <div className="mkt-slider-controls">
          <button
            type="button"
            className="mkt-slider-arrow"
            aria-label="Anterior"
            onClick={() => go(current - 1)}
          >
            ‹
          </button>
          <div className="mkt-slider-dots">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className="mkt-slider-dot"
                aria-label={`Ver ${item.label}`}
                aria-current={i === current}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="mkt-slider-arrow"
            aria-label="Siguiente"
            onClick={() => go(current + 1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
