import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const BRAND_IMAGE_SIZE = { width: 1200, height: 630 };
export const BRAND_IMAGE_ALT =
  'Faciliter — software de afiliaciones para gyms, clubes y estudios';

const BG = '#0a0a0a';
const ACCENT = '#a3e635';

function fontFile(name: string): Promise<Buffer> {
  return readFile(join(process.cwd(), 'assets', 'fonts', name));
}

/**
 * Preview al compartir (Open Graph / Twitter), 1200×630 a sangre.
 *
 * @remarks Se genera en el build (sin APIs dinámicas). Isotipo = triángulo de
 * nodos de la app y el favicon; tipografía Barlow Condensed (OFL, en
 * `assets/fonts`). Pensada para que Google, WhatsApp y Discord no muestren
 * bandas vacías.
 */
export async function renderBrandImage(): Promise<ImageResponse> {
  const [bold, semiBold] = await Promise.all([
    fontFile('BarlowCondensed-Bold.ttf'),
    fontFile('BarlowCondensed-SemiBold.ttf'),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 72,
          background: BG,
          padding: '0 80px',
        }}
      >
        <svg width="270" height="270" viewBox="4 3.5 16 16">
          <g fill="none" stroke={ACCENT} strokeWidth="1.1" strokeLinecap="round">
            <path d="M10.4 8.2 7.8 15.1M13.6 8.2l2.6 6.9M8.7 17h6.6" />
          </g>
          <g fill={ACCENT}>
            <circle cx="12" cy="6.5" r="2.4" />
            <circle cx="6.5" cy="17" r="2.4" />
            <circle cx="17.5" cy="17" r="2.4" />
          </g>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontFamily: 'Barlow Condensed',
              fontWeight: 700,
              fontSize: 190,
              lineHeight: 1,
              letterSpacing: 2,
              color: ACCENT,
            }}
          >
            FACILITER
          </div>
          <div
            style={{
              fontFamily: 'Barlow Condensed',
              fontWeight: 600,
              fontSize: 44,
              lineHeight: 1.15,
              color: '#f5f5f5',
              marginTop: 12,
              maxWidth: 640,
            }}
          >
            Software de afiliaciones para gyms, clubes y estudios
          </div>
        </div>
      </div>
    ),
    {
      ...BRAND_IMAGE_SIZE,
      fonts: [
        { name: 'Barlow Condensed', data: bold, weight: 700, style: 'normal' },
        {
          name: 'Barlow Condensed',
          data: semiBold,
          weight: 600,
          style: 'normal',
        },
      ],
    },
  );
}
