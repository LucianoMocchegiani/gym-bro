/**
 * Web pública del gym editable (módulo `tenant-site`, RN-CTA-010).
 *
 * @remarks Mismos tipos y límites que `api/src/tenant-site/tenant-site.types.ts`
 * y `tenant-site.constants.ts`: cambiar los dos juntos.
 */

import { apiRequest } from '@/lib/api/client';

export type SiteTone = 'LIGHT' | 'DARK';
export type SiteOverlay = 'SOFT' | 'MEDIUM' | 'STRONG';
export type SiteFocusX = 'LEFT' | 'CENTER' | 'RIGHT';
export type SiteFocusY = 'TOP' | 'CENTER' | 'BOTTOM';
export type SiteButtonTarget = 'PLANS' | 'BOOK' | 'PACK' | 'URL';

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

export type SiteTheme = 'light' | 'dark';

/** Fondo de hero y slides: una imagen y colores para cada tema. */
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
  hero: SiteHero;
  sliders: SiteSlider[];
};

export type TenantSiteDetail = {
  /** null = vidriera por defecto. */
  content: TenantSiteContent | null;
  updatedAt: string | null;
};

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

/** Carpeta de `POST /upload` que acepta el PUT. */
export const SITE_IMAGE_FOLDER = 'site';

/** Lee el contenido (`tenant.settings.read`). */
export function getTenantSite(): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site');
}

/** Reemplaza y publica (`tenant.settings.write`). */
export function putTenantSite(
  content: TenantSiteContent,
): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site', {
    method: 'PUT',
    body: content,
  });
}

/** Vuelve a la vidriera por defecto (`tenant.settings.write`). */
export function resetTenantSite(): Promise<TenantSiteDetail> {
  return apiRequest<TenantSiteDetail>('/tenant-site', { method: 'DELETE' });
}
