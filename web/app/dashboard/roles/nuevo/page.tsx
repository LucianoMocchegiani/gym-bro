import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoRolRedirectPage() {
  redirect('/dashboard/roles?nuevo=1');
}
