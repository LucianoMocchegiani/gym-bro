import type { NextConfig } from 'next';

const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase();

/**
 * Orígenes extra para HMR /assets de `next dev` detrás del tunnel.
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const allowedDevOrigins = [
  'localhost',
  '*.localhost',
  ...(appDomain ? [appDomain, `*.${appDomain}`] : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins,
};

export default nextConfig;
