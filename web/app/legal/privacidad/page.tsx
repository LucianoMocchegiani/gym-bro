import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { MARKETING_MAIL, publicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Privacidad',
  description:
    'Política de privacidad de Faciliter (borrador). Datos de gyms, clubes, estudios y socios en Argentina.',
  alternates: { canonical: `${publicSiteUrl()}/legal/privacidad` },
};

/**
 * Privacidad pública. Borrador operativo; no es el texto final para AFIP/AAIP.
 */
export default function PrivacidadPage() {
  return (
    <MarketingShell>
      <MktShell as="article" className="mkt-legal">
        <p className="eyebrow">Legal</p>
        <h1>Privacidad</h1>
        <p className="muted">
          Borrador. No es asesoramiento legal. Última actualización: 9 de
          septiembre de 2026.
        </p>
        <p>
          Tratamos datos para prestar Faciliter: contacto de quien nos
          escribe, cuentas de staff y, en cada tenant (gym, club o estudio),
          los datos que esa operación carga de sus socios (alta, cobros,
          acceso).
        </p>
        <h2>Quién es responsable</h2>
        <p>
          El tenant es responsable de los datos de sus afiliados. Faciliter
          procesa esos datos como proveedor del software, en esa cuenta.
        </p>
        <h2>Qué no hacemos</h2>
        <p>
          No vendemos padrones. El asistente del Admin no cobra ni cambia
          datos por su cuenta. El asistente de la landing pública no ve
          datos de un gym: solo explica el producto. Esa prueba guarda un
          hilo anónimo en el servicio de chat (sesión en el navegador).
        </p>
        <h2>Contacto</h2>
        <p>
          Pedidos sobre datos:{' '}
          <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.
        </p>
      </MktShell>
    </MarketingShell>
  );
}
