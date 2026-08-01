import type { NextConfig } from 'next';

const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase();
const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim().toLowerCase();

/**
 * Orígenes extra para HMR /assets de `next dev` detrás del tunnel.
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
const allowedDevOrigins = [
  'localhost',
  '*.localhost',
  ...(appDomain ? [appDomain, `*.${appDomain}`] : []),
  ...(platformHost ? [platformHost] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
