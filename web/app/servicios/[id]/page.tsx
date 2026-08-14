import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/**
 * Compat: edición en modal del listado.
 */
export default async function ServicioDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/servicios?editar=${encodeURIComponent(id)}`);
}
