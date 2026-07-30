import { redirect } from 'next/navigation';

/**
 * Entrada del panel web: redirige al flujo puerta.
 */
export default function Home() {
  redirect('/puerta');
}
