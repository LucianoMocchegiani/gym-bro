import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado.
 */
export default function NuevoAfiliadoRedirectPage() {
  redirect('/afiliados?nuevo=1');
}
