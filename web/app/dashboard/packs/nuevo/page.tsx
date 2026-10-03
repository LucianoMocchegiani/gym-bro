import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoPackRedirectPage() {
  redirect('/dashboard/packs?nuevo=1');
}
