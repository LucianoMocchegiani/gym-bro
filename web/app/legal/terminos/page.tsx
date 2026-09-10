import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { MARKETING_MAIL, publicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description:
    'Términos de uso de Faciliter (borrador). Software para gyms, clubes y estudios en Argentina.',
  alternates: { canonical: `${publicSiteUrl()}/legal/terminos` },
};

/**
 * Términos públicos. Borrador operativo; no reemplaza un contrato revisado.
 */
export default function TerminosPage() {
  return (
    <MarketingShell>
      <MktShell as="article" className="mkt-legal">
        <p className="eyebrow">Legal</p>
        <h1>Términos de uso</h1>
        <p className="muted">
          Borrador. No es asesoramiento legal. Última actualización: 9 de
          septiembre de 2026.
        </p>
        <p>
          Faciliter es un software de afiliaciones para gyms, clubes y
          estudios (socios, packs, caja, puerta y app). El acceso al producto
          se acuerda con el operador de la plataforma.
        </p>
        <h2>Cuentas</h2>
        <p>
          Cada tenant (gym, club o estudio) opera aislado. El staff y los
          socios son responsabilidad de esa operación. Las credenciales no se
          comparten.
        </p>
        <h2>Uso</h2>
        <p>
          El servicio se ofrece “tal cual”. No garantizamos disponibilidad
          continua ni un resultado comercial. El tenant es responsable de
          cobros, acceso físico y datos que carga.
        </p>
        <h2>Contacto</h2>
        <p>
          Consultas:{' '}
          <a href={`mailto:${MARKETING_MAIL}`}>{MARKETING_MAIL}</a>.
        </p>
      </MktShell>
    </MarketingShell>
  );
}
