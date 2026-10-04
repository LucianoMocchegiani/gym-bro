import Link from 'next/link';
import {
  NavIconAssistant,
  NavIconCash,
  NavIconDoor,
  NavIconPack,
  NavIconPeople,
} from '@/components/AdminNavIcons';
import { LandingSlider, type LandingSlide } from '@/components/marketing/LandingSlider';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { PackPlanCard } from '@/components/marketing/PackPlanCard';
import { fetchPublicPlatformPacks } from '@/lib/api/public-platform';
import { BOOKING_URL, publicSiteUrl } from '@/lib/site-url';

const SLIDES: LandingSlide[] = [
  {
    id: 'servicios',
    eyebrow: 'Servicios',
    title: 'Armás tu oferta. El sistema se adapta.',
    body: 'Gym, club o estudio: cuotas mensuales, clases sueltas o packs de créditos, como los definas.',
    topic: 'los servicios y packs',
    icon: <NavIconPack />,
  },
  {
    id: 'cobros',
    eyebrow: 'Cobros',
    title: 'Cobrás online y en el mostrador.',
    body: 'Mercado Pago de tu cuenta, débito automático y efectivo en caja, en el mismo sistema.',
    topic: 'los cobros',
    icon: <NavIconCash />,
  },
  {
    id: 'socio',
    eyebrow: 'App y portal del socio',
    title: 'Tus socios se gestionan solos.',
    body: 'Desde la app o la web de tu gym reservan clases, compran packs y ven sus pagos, documentos y avisos.',
    topic: 'la app y el portal del socio',
    icon: <NavIconPeople />,
  },
  {
    id: 'puerta',
    eyebrow: 'Puerta · opcional',
    title: 'Controlá quién entra.',
    body: 'Pasa quien tiene un servicio activo y queda el registro. Elegís cómo:',
    tags: ['Kuatia: credencial en la app (QR)', 'ZKTeco: huella, tarjeta o PIN'],
    topic: 'la puerta de acceso',
    icon: <NavIconDoor />,
  },
  {
    id: 'asistente',
    eyebrow: 'Asistente',
    title: 'Preguntale a Brain.',
    body: 'Socios, caja o clases: responde con los datos de tu operación. No cobra ni cambia nada solo.',
    topic: 'el asistente',
    icon: <NavIconAssistant />,
  },
];

/**
 * Landing Faciliter: hero, slider de producto (el detalle lo da el asistente
 * con «Más información»), planes del catálogo y CTA.
 */
export async function LandingPage() {
  const site = publicSiteUrl();
  const packs = await fetchPublicPlatformPacks();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}#organization`,
        name: 'Faciliter',
        url: site,
        logo: `${site}/icon.png`,
        areaServed: { '@type': 'Country', name: 'Argentina' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Faciliter',
        alternateName: 'Faciliter Brain',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        description:
          'Faciliter es el sistema de afiliaciones para gyms, clubes y estudios: cobros en línea y en efectivo, app del afiliado, puerta QR y asistente.',
        url: site,
        image: `${site}/icon.png`,
        publisher: { '@id': `${site}#organization` },
        offers: {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          url: `${site}#precio`,
        },
        areaServed: { '@type': 'Country', name: 'Argentina' },
      },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MktShell as="section" className="mkt-hero">
        <div className="mkt-hero-copy">
          <p className="mkt-kicker">Software de afiliaciones · Argentina</p>
          <h1>
            Faciliter: el cerebro de tus{' '}
            <span className="accent-text">afiliados</span>.
          </h1>
          <p className="mkt-lead">
            Afiliados, cobros, puerta y app en un solo sistema, para gyms,
            clubes y estudios.
          </p>
          <div className="mkt-hero-actions">
            <a
              className="mkt-btn-primary"
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
            >
              Agendá una reunión
            </a>
            <Link className="mkt-btn-ghost" href="/docs">
              Guía de uso
            </Link>
          </div>
        </div>
      </MktShell>

      <section id="producto" className="mkt-inner mkt-section-tight">
        <LandingSlider slides={SLIDES} label="Qué incluye Faciliter Brain" />
      </section>

      <section id="precio" className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Planes</h2>
        <p className="mkt-section-lead">
          Elegí un plan para dar de alta tu gym.
        </p>
        {packs.length === 0 ? (
          <p className="muted">El catálogo no está disponible ahora.</p>
        ) : (
          <div className="mkt-plans">
            {packs.map((pack) => (
              <PackPlanCard
                key={pack.id}
                name={pack.name}
                price={pack.price}
                billingPeriod={pack.billingPeriod}
                description={pack.description}
                items={pack.services.map((s) => s.name)}
                action={
                  <a
                    className="mkt-btn-primary"
                    href={`/empezar?pack=${encodeURIComponent(pack.id)}`}
                  >
                    Contratar
                  </a>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mkt-inner mkt-section-tight">
        <div className="mkt-cta-panel">
          <div>
            <h2 className="mkt-h2">Empezá a utilizar Faciliter Brain</h2>
            <p className="muted">
              Te mostramos cómo queda tu operación en una reunión corta.
            </p>
          </div>
          <div className="mkt-hero-actions">
            <a
              className="mkt-btn-primary"
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
            >
              Agendá una reunión
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
