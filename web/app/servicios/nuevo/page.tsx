import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoServicioRedirectPage() {
  redirect('/servicios?nuevo=1');
}
