import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteBrandStyle } from './site-theme.ts';

function contrast(a, b) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test('button text keeps WCAG AA contrast on light, dark and saturated brand colors', () => {
  for (const color of ['#a3e635', '#ffffff', '#000000', '#1245bb', '#ff7aa8']) {
    const style = siteBrandStyle(color);
    assert.ok(contrast(style['--site-primary'], style['--site-primary-ink']) >= 4.5);
  }
});

test('invalid saved colors fall back to the Faciliter default', () => {
  assert.equal(siteBrandStyle('url(javascript:alert(1))')['--site-primary'], '#a3e635');
});
