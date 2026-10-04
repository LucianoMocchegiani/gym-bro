/**
 * Contenido editable de la web pública del gym (RN-CTA-010).
 *
 * @remarks Se guarda como JSON en `tenant_sites.content`. La web lo dibuja con
 * los mismos tipos (`web/lib/api/tenant-site.ts`): mantener ambos alineados.
 */

/** Tono del texto: LIGHT = texto claro sobre capa oscura; DARK = al revés. */
export const SITE_TONES = ['LIGHT', 'DARK'] as const;
export type SiteTone = (typeof SITE_TONES)[number];

/** Intensidad de la capa entre la imagen y el texto. */
export const SITE_OVERLAYS = ['SOFT', 'MEDIUM', 'STRONG'] as const;
export type SiteOverlay = (typeof SITE_OVERLAYS)[number];

export const SITE_FOCUS_X = ['LEFT', 'CENTER', 'RIGHT'] as const;
export type SiteFocusX = (typeof SITE_FOCUS_X)[number];

export const SITE_FOCUS_Y = ['TOP', 'CENTER', 'BOTTOM'] as const;
export type SiteFocusY = (typeof SITE_FOCUS_Y)[number];

/** Destino del botón de un slide. */
export const SITE_BUTTON_TARGETS = ['PLANS', 'BOOK', 'PACK', 'URL'] as const;
export type SiteButtonTarget = (typeof SITE_BUTTON_TARGETS)[number];

export type SiteImage = {
  url: string;
  /** Vacío → la web usa el título. */
  alt: string | null;
  focusX: SiteFocusX;
  focusY: SiteFocusY;
};

/** Colores de un bloque en un tema de la web (claro u oscuro). */
export type SiteThemeColors = {
  tone: SiteTone;
  /** `#rrggbb` para el título; null = mismo color que el texto. */
  accent: string | null;
  overlay: SiteOverlay;
};

/** Temas de la web: el visitante ve uno u otro según su preferencia. */
export const SITE_THEMES = ['light', 'dark'] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

/** Fondo de hero y slides: una imagen y colores para cada tema. */
export type SiteVisual = {
  image: SiteImage | null;
  light: SiteThemeColors;
  dark: SiteThemeColors;
};

export type SiteButton = {
  label: string;
  target: SiteButtonTarget;
  /** Solo con `PACK`. */
  packId: string | null;
  /** Solo con `URL` (https). */
  url: string | null;
};

export type SiteHero = SiteVisual & {
  title: string;
  subtitle: string | null;
};

export type SiteSlide = SiteVisual & {
  id: string;
  title: string;
  body: string | null;
  button: SiteButton | null;
};

export type SiteSlider = {
  id: string;
  title: string | null;
  slides: SiteSlide[];
};

export type TenantSiteContent = {
  hero: SiteHero;
  sliders: SiteSlider[];
};

/** `GET /tenant-site`: null = el gym no configuró nada (vidriera por defecto). */
export type TenantSiteDetail = {
  content: TenantSiteContent | null;
  updatedAt: Date | null;
};
