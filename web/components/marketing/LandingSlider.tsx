'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { askAssistant } from '@/lib/assistant-ask';

export type LandingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Opciones cortas (ej. las dos formas de la puerta). */
  tags?: string[];
  /** Completa «Quiero más información de …» para el asistente. */
  topic: string;
  icon: ReactNode;
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
 * Carrusel de la landing: un tema por slide y «Más información», que abre el
 * asistente público con la pregunta ya enviada (el detalle lo da el MCP).
 *
 * @remarks Rota solo cada 6 s salvo con hover/foco o `prefers-reduced-motion`.
 * Todos los slides quedan en el HTML (SEO); los ocultos van `inert`.
 */
export function LandingSlider({
  slides,
  label,
}: {
  slides: LandingSlide[];
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

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
      className="mkt-slider"
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
        go(index + (end < start ? 1 : -1));
      }}
    >
      <div className="mkt-slider-viewport">
        <div
          className="mkt-slider-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="mkt-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${count}: ${slide.title}`}
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <span className="mkt-icon-box" aria-hidden="true">
                {slide.icon}
              </span>
              <p className="eyebrow">{slide.eyebrow}</p>
              <h3 className="mkt-slide-title">{slide.title}</h3>
              <p className="mkt-slide-body">{slide.body}</p>
              {slide.tags ? (
                <ul className="mkt-slide-tags">
                  {slide.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                className="mkt-btn-ghost"
                onClick={() =>
                  askAssistant(`Quiero más información de ${slide.topic}`)
                }
              >
                Más información
              </button>
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
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <div className="mkt-slider-dots">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className="mkt-slider-dot"
                aria-label={`Ver ${slide.title}`}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="mkt-slider-arrow"
            aria-label="Siguiente"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
