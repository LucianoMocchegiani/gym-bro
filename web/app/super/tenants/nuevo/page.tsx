import { redirect } from 'next/navigation';

/**
 * Compat: alta en modal del listado Super.
 */
export default function NuevoTenantRedirectPage() {
  redirect('/super/tenants?nuevo=1');
}
