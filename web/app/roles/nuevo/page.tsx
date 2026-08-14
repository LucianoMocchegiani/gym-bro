import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoRolRedirectPage() {
  redirect('/roles?nuevo=1');
}
