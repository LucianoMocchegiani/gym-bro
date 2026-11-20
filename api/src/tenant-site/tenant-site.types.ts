export type SiteSocialLinks = {
  facebook: string | null;
  x: string | null;
  tiktok: string | null;
  instagram: string | null;
  whatsapp: string | null;
};

export type SiteTone = 'LIGHT' | 'DARK';
export type SiteOverlay = 'SOFT' | 'MEDIUM' | 'STRONG';
export type SiteFocusX = 'LEFT' | 'CENTER' | 'RIGHT';
export type SiteFocusY = 'TOP' | 'CENTER' | 'BOTTOM';
export type SiteButtonTarget = 'PLANS' | 'BOOK' | 'PACK' | 'URL';

export type SiteSocialLinksDto = Partial<SiteSocialLinks>;

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
  brandIcon?: string | null;
  /** Omitido en contenido anterior. */
  socialLinks?: SiteSocialLinks;
  hero: SiteHero;
  sliders: SiteSlider[];
};

export type TenantSiteDetail = {
  content: TenantSiteContent | null;
  updatedAt: Date | null;
};

export const SITE_DEFAULT_PRIMARY_COLOR = '#a3e635';
