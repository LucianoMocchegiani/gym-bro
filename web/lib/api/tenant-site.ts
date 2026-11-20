import { apiRequest } from '@/lib/api/client';

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
  /** Omitido por contenido anterior; no hay redes configuradas. */
  socialLinks?: SiteSocialLinks;
  hero: SiteHero;
  sliders: SiteSlider[];
};

export type TenantSiteDetail = {
  content: TenantSiteContent | null;
  updatedAt: string | null;
};

export const SITE_DEFAULT_PRIMARY_COLOR = '#a3e635';

export const SITE_LIMITS = {
  heroTitle: { min: 10, max: 80 },
  heroSubtitle: { max: 200 },
  sliders: { max: 5 },
  sliderTitle: { max: 60 },
  slides: { min: 1, max: 10 },
  slideTitle: { min: 3, max: 60 },
  slideBody: { max: 180 },
  buttonLabel: { min: 2, max: 24 },
  imageAlt: { max: 120 },
  url: { max: 500 },
  id: { max: 40 },
} as const;

export const SITE_IMAGE_FOLDER = 'site';

export function getTenantSite(): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site');
}

export function putTenantSite(content: TenantSiteContent): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site', { method: 'PUT', body: content });
}

export function resetTenantSite(): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site', { method: 'DELETE' });
}
