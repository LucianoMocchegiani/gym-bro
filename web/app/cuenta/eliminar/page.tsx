import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { publicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Eliminar tu cuenta',
  description:
    'Cómo eliminar tu cuenta de Faciliter desde la app o la web, y qué datos se borran.',
  alternates: { canonical: `${publicSiteUrl()}/cuenta/eliminar` },
};

/**
 * Página pública para pedir la baja de la cuenta (URL de Google Play, CU-CTA-001).
 *
 * @remarks No requiere sesión: explica los pasos y lleva a `/cuenta`. Con
 * `?hecho=1` confirma la baja (redirige acá `IdentityAccountPage`).
 */
export default async function EliminarCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ hecho?: string }>;
}) {
  const { hecho } = await searchParams;
  return (
    <MarketingShell>
      <MktShell as="article" className="mkt-legal">
        <p className="eyebrow">Cuenta</p>
        <h1>Eliminar tu cuenta de Faciliter</h1>
        {hecho ? (
          <p className="success">
            Tu cuenta fue eliminada. Te mandamos un mail de confirmación.
          </p>
        ) : null}
        <h2>Cómo hacerlo</h2>
        <ul>
          <li>
            <strong>Desde la app:</strong> Ajustes → Eliminar cuenta → escribí
            ELIMINAR.
          </li>
          <li>
            <strong>Desde la web:</strong> entrá a{' '}
            <Link href="/cuenta">Mi cuenta</Link> con tu mail, Google o Apple →
            Eliminar cuenta → escribí ELIMINAR.
          </li>
        </ul>
        <h2>Qué se borra</h2>
        <ul>
          <li>
            Tu cuenta: mail, nombre, contraseña y vínculos con Google y Apple.
            No vas a poder volver a entrar con ella.
          </li>
          <li>Tus avisos y preferencias.</li>
          <li>
            Tus reservas futuras y los débitos automáticos activos. Lo que te
            quede de packs vigentes se pierde.
          </li>
          <li>Las credenciales de la wallet del celular (al hacerlo desde la app).</li>
        </ul>
        <h2>Qué se conserva</h2>
        <p>
          Cada gym donde estuviste conserva tu ficha y el historial de pagos y
          comprobantes: son su registro comercial. Si querés que un gym también
          lo borre, pedíselo directamente.
        </p>
        <p>
          La baja es inmediata. Si después volvés a entrar con el mismo mail,
          empezás con una cuenta nueva y vacía.
        </p>
        <p>
          <Link className="btn" href="/cuenta">
            Ir a Mi cuenta
          </Link>
        </p>
      </MktShell>
    </MarketingShell>
  );
}
