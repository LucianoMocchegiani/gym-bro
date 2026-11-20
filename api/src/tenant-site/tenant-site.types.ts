/**
 * Contenido editable de la web pública del gym (RN-CTA-010).
 *
 * @remarks Se guarda como JSON en `tenant_sites.content`. La web lo dibuja con
 * los mismos tipos (`web/lib/api/tenant-site.ts`): mantener ambos alineados.
 */

export const SITE_DEFAULT_PRIMARY_COLOR = '#a3e635';
export const SITE_TONES = ['LIGHT', 'DARK'] as const;
export type SiteTone = (typeof SITE_TONES)[number];
export const SITE_OVERLAYS = ['SOFT', 'MEDIUM', 'STRONG'] as const;
export type SiteOverlay = (typeof SITE_OVERLAYS)[number];
export const SITE_FOCUS_X = ['LEFT', 'CENTER', 'RIGHT'] as const;
export type SiteFocusX = (typeof SITE_FOCUS_X)[number];
export const SITE_FOCUS_Y = ['TOP', 'CENTER', 'BOTTOM'] as const;
export type SiteFocusY = (typeof SITE_FOCUS_Y)[number];
export const SITE_BUTTON_TARGETS = ['PLANS', 'BOOK', 'PACK', 'URL'] as const;
export type SiteButtonTarget = (typeof SITE_BUTTON_TARGETS)[number];

/** Enlaces públicos opcionales configurados por el tenant. */
export type SiteSocialLinks = {
  facebook: string | null;
  x: string | null;
  tiktok: string | null;
  instagram: string | null;
  whatsapp: string | null;
};

export type SiteImage = {
  url: string;
  /** Vacío → la web usa el título. */
  alt: string | null;
  focusX: SiteFocusX;
  focusY: SiteFocusY;
};

export type SiteThemeColors = {
  tone: SiteTone;
  /** `#rrggbb` para el título; null = mismo color que el texto. */
  accent: string | null;
  overlay: SiteOverlay;
};

export const SITE_THEMES = ['light', 'dark'] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];
export type SiteVisual = {
  image: SiteImage | null;
  light: SiteThemeColors;
  dark: SiteThemeColors;
};

export type SiteButton = {
  label: string;
  target: SiteButtonTarget;
  packId: string | null;
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
  /** Ausente en contenido anterior; el lector le aplica el verde predeterminado. */
  themeColor?: string;
  /** URL del ícono público del gimnasio; ausente en sitios anteriores. */
  brandIcon?: string | null;
  /** Ausente en contenido anterior. */
  socialLinks?: SiteSocialLinks;
  hero: SiteHero;
  sliders: SiteSlider[];
};

export type TenantSiteDetail = {
  content: TenantSiteContent | null;
  updatedAt: Date | null;
};
