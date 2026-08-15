'use client';

import NextTopLoader from 'nextjs-toploader';

/**
 * Barra de progreso bajo el chrome al navegar (Admin + Super).
 *
 * @remarks Solo Links / clics de ancla; `router.replace` de query (modales) no la dispara.
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="var(--accent, #a3e635)"
      height={2}
      showSpinner={false}
      shadow={false}
      crawl
      crawlSpeed={180}
      speed={200}
      easing="ease"
      zIndex={9999}
    />
  );
}
