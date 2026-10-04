import type { SiteButton } from '@/lib/api/tenant-site';

export type SiteButtonLink = { href: string; external: boolean };

/**
 * A dónde lleva el botón de un slide en la web del gym (RN-CTA-010).
 *
 * @param packIds - Packs publicados hoy (un pack desactivado oculta el botón).
 * @param onlineCheckout - Sin Mercado Pago, «Comprar» lleva a los planes.
 * @returns null si el destino ya no existe.
 */
export function siteButtonLink(
  button: SiteButton,
  packIds: ReadonlySet<string>,
  onlineCheckout: boolean,
): SiteButtonLink | null {
  switch (button.target) {
    case 'PLANS':
      return { href: '#planes', external: false };
    case 'BOOK':
      return { href: '/portal/clases', external: false };
    case 'PACK':
      if (!button.packId || !packIds.has(button.packId)) {
        return null;
      }
      return {
        href: onlineCheckout
          ? `/comprar?pack=${encodeURIComponent(button.packId)}`
          : '#planes',
        external: false,
      };
    case 'URL':
      return button.url ? { href: button.url, external: true } : null;
  }
}
