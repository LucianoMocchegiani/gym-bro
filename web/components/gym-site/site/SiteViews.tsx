import type { CSSProperties, ReactNode } from 'react';
import type {
  SiteFocusX,
  SiteFocusY,
  SiteHero,
  SiteSlide,
  SiteVisual,
} from '@/lib/api/tenant-site';
import {
  SITE_BASE,
  SITE_OVERLAY_ALPHA,
  SITE_TEXT,
} from '@/lib/site-contrast';

const FOCUS_X: Record<SiteFocusX, string> = {
  LEFT: '0%',
  CENTER: '50%',
  RIGHT: '100%',
};

const FOCUS_Y: Record<SiteFocusY, string> = {
  TOP: '0%',
  CENTER: '50%',
  BOTTOM: '100%',
};

/**
 * Fondo (imagen + capa o color liso) y colores del texto de hero y slides.
 *
 * @remarks Sin hooks: lo usan la web del gym (Server Component) y la vista
 * previa del editor. Los colores salen de `site-contrast` (la API valida con
 * los mismos valores).
 */
function SiteFrame({
  visual,
  alt,
  eager,
  className,
  children,
}: {
  visual: SiteVisual;
  alt: string;
  eager: boolean;
  className: string;
  children: ReactNode;
}) {
  const text = SITE_TEXT[visual.tone];
  const overlay = visual.tone === 'LIGHT' ? '0, 0, 0' : '255, 255, 255';
  const style = {
    '--site-text': text,
    '--site-title': visual.accent ?? text,
    '--site-bg': SITE_BASE[visual.tone],
    '--site-overlay': `rgba(${overlay}, ${SITE_OVERLAY_ALPHA[visual.overlay]})`,
  } as CSSProperties;
  const { image } = visual;
  return (
    <div className={`site-frame ${className}`} style={style}>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="site-frame-img"
            src={image.url}
            alt={image.alt ?? alt}
            loading={eager ? 'eager' : 'lazy'}
            style={{
              objectPosition: `${FOCUS_X[image.focusX]} ${FOCUS_Y[image.focusY]}`,
            }}
          />
          <div className="site-frame-overlay" aria-hidden="true" />
        </>
      ) : null}
      <div className="site-frame-content">{children}</div>
    </div>
  );
}

/** Portada de la web del gym. `actions` = botones (o su vista previa). */
export function SiteHeroView({
  hero,
  actions,
}: {
  hero: SiteHero;
  actions?: ReactNode;
}) {
  return (
    <SiteFrame visual={hero} alt={hero.title} eager className="site-hero">
      <h1 className="site-title">{hero.title}</h1>
      {hero.subtitle ? <p className="site-lead">{hero.subtitle}</p> : null}
      {actions ? <div className="mkt-hero-actions">{actions}</div> : null}
    </SiteFrame>
  );
}

/** Un slide de un slider. `button` = link ya resuelto (o su vista previa). */
export function SiteSlideView({
  slide,
  button,
}: {
  slide: SiteSlide;
  button?: ReactNode;
}) {
  return (
    <SiteFrame
      visual={slide}
      alt={slide.title}
      eager={false}
      className="site-slide"
    >
      <h3 className="site-title">{slide.title}</h3>
      {slide.body ? <p className="site-lead">{slide.body}</p> : null}
      {button ? <div className="site-slide-action">{button}</div> : null}
    </SiteFrame>
  );
}
