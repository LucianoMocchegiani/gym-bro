import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevaSesionRedirectPage() {
  redirect('/dashboard/sesiones?nuevo=1');
}
