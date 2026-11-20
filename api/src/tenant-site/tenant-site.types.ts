export type SiteTone = 'LIGHT' | 'DARK';
export type SiteOverlay = 'SOFT' | 'MEDIUM' | 'STRONG';
export type SiteFocusX = 'LEFT' | 'CENTER' | 'RIGHT';
export type SiteFocusY = 'TOP' | 'CENTER' | 'BOTTOM';
export type SiteButtonTarget = 'PLANS' | 'BOOK' | 'PACK' | 'URL';

export type SiteImage = {
  url: string;
  alt: string | null;
  focusX: SiteFocusX;
  focusY: SiteFocusY;
};

export type SiteThemeColors = {
  tone: SiteTone;
  accent: string | null;
  overlay: SiteOverlay;
};

export type SiteTheme = 'light' | 'dark';

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
  themeColor?: string;
  /** URL del ícono público del gimnasio; ausente en sitios anteriores. */
  brandIcon?: string | null;
  hero: SiteHero;
  sliders: SiteSlider[];
};

export type TenantSiteDetail = {
  content: TenantSiteContent | null;
  updatedAt: Date | null;
};

/** Color de marca predeterminado de Faciliter para webs sin personalización. */
export const SITE_DEFAULT_PRIMARY_COLOR = '#a3e635';

export const SITE_TONES = ['LIGHT', 'DARK'] as const;
export const SITE_OVERLAYS = ['SOFT', 'MEDIUM', 'STRONG'] as const;
export const SITE_FOCUS_X = ['LEFT', 'CENTER', 'RIGHT'] as const;
export const SITE_FOCUS_Y = ['TOP', 'CENTER', 'BOTTOM'] as const;
export const SITE_BUTTON_TARGETS = ['PLANS', 'BOOK', 'PACK', 'URL'] as const;
