import type { CSSProperties } from 'react';

const DEFAULT_PRIMARY = '#a3e635';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type SiteBrandStyle = CSSProperties & {
  '--site-primary': string;
  '--site-primary-ink': string;
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const linear = channels.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Chooses a readable label color and safely ignores invalid stored values. */
export function siteBrandStyle(color: string): SiteBrandStyle {
  const primary = HEX_COLOR.test(color) ? color.toLowerCase() : DEFAULT_PRIMARY;
  const lightness = luminance(primary);
  const primaryInk =
    (lightness + 0.05) / 0.05 >= 1.05 / (lightness + 0.05)
      ? '#000000'
      : '#ffffff';
  return {
    '--site-primary': primary,
    '--site-primary-ink': primaryInk,
  } as SiteBrandStyle;
}
