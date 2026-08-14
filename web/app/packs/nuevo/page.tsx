import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoPackRedirectPage() {
  redirect('/packs?nuevo=1');
}
