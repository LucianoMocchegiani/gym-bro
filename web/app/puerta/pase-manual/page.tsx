import { redirect } from 'next/navigation';

/**
 * Compat: la ruta suelta redirige al tab de Puerta.
 */
export default function PaseManualRedirectPage() {
  redirect('/puerta?tab=pase');
}
