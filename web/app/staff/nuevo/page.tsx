import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoStaffRedirectPage() {
  redirect('/staff?nuevo=1');
}
