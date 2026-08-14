import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/**
 * Compat: edición en modal del listado.
 */
export default async function RolDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/roles?editar=${encodeURIComponent(id)}`);
}
