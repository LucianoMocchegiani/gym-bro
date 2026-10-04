import type {
  SiteOverlay,
  SiteThemeColors,
  SiteTone,
} from '@/lib/api/tenant-site';

/**
 * Colores de la web del gym y chequeo de legibilidad (RN-CTA-010).
 *
 * @remarks Copia exacta de `api/src/tenant-site/site-contrast.ts` (la API
 * rechaza lo mismo que acá se avisa): cambiar los dos juntos.
 *
 * Con imagen, el peor caso es una foto toda blanca (texto claro) o toda negra
 * (texto oscuro). Las capas están calculadas para que el texto del cuerpo
 * pase 4.5:1 aun así; lo que se valida es el acento del título (3:1, texto
 * grande).
 */
export const SITE_TEXT: Record<SiteTone, string> = {
  LIGHT: '#f8f8f6',
  DARK: '#121212',
};

/** Fondo liso cuando no hay imagen. */
export const SITE_BASE: Record<SiteTone, string> = {
  LIGHT: '#141517',
  DARK: '#f4f4f1',
};

/** Opacidad de la capa (negra con texto claro, blanca con texto oscuro). */
export const SITE_OVERLAY_ALPHA: Record<SiteOverlay, number> = {
  SOFT: 0.58,
  MEDIUM: 0.7,
  STRONG: 0.82,
};

export const SITE_MIN_TITLE_CONTRAST = 3;

type Rgb = [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;

export function isSiteHex(value: string): boolean {
  return HEX.test(value);
}

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Fondo contra el que se mide el título: el liso o el peor caso con imagen. */
function worstBackground(colors: SiteThemeColors, hasImage: boolean): Rgb {
  if (!hasImage) {
    return toRgb(SITE_BASE[colors.tone]);
  }
  const alpha = SITE_OVERLAY_ALPHA[colors.overlay];
  const channel =
    colors.tone === 'LIGHT'
      ? Math.round(255 * (1 - alpha))
      : Math.round(255 * alpha);
  return [channel, channel, channel];
}

/** Contraste del título (acento o color del texto) contra su peor fondo. */
export function siteTitleContrast(
  colors: SiteThemeColors,
  hasImage: boolean,
): number {
  const color = colors.accent ?? SITE_TEXT[colors.tone];
  return contrast(toRgb(color), worstBackground(colors, hasImage));
}

/**
 * Mensaje para el staff si el título no se va a leer en un tema; null si está
 * bien.
 */
export function siteContrastIssue(
  colors: SiteThemeColors,
  hasImage: boolean,
): string | null {
  if (colors.accent && !isSiteHex(colors.accent)) {
    return 'El color del título tiene que ser #rrggbb';
  }
  if (siteTitleContrast(colors, hasImage) < SITE_MIN_TITLE_CONTRAST) {
    return hasImage
      ? 'El color del título no se va a leer sobre la imagen: probá otro color, otro tono o una capa más fuerte'
      : 'El color del título no se va a leer sobre el fondo: probá otro color u otro tono';
  }
  return null;
}
