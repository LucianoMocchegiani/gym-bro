import Link from 'next/link';
import {
  NavIconAssistant,
  NavIconDoor,
  NavIconPeople,
} from '@/components/AdminNavIcons';
import { AppHomeMock } from '@/components/marketing/AppHomeMock';
import { CheckList } from '@/components/marketing/CheckList';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MktShell } from '@/components/marketing/MktShell';
import { PhoneFrame } from '@/components/marketing/PhoneFrame';
import { ProductPreviewCard } from '@/components/marketing/ProductPreviewCard';
import { MARKETING_MAIL, publicSiteUrl } from '@/lib/site-url';

const PILLARS: {
  title: string;
  body: string;
  icon: 'people' | 'assistant' | 'door';
}[] = [
  {
    title: 'Cobrar',
    body: 'Brain cobra y debita a tus afiliados en línea (Mercado Pago de tu cuenta). Los pagos en efectivo los registra el personal en caja. El dinero del afiliado no se queda en Faciliter.',
    icon: 'people',
  },
  {
    title: 'Entrar',
    body: 'La app es la credencial. En puerta el personal ve permitido o no, y queda el registro: socio, hora y si venía a una clase. Entra con un servicio activo, o si el personal lo autoriza.',
    icon: 'door',
  },
  {
    title: 'Consultar',
    body: 'Toda esa información está en Brain. La ves en el panel o se la preguntás al asistente. El asistente responde con los datos de la operación: no cobra ni cambia nada solo.',
    icon: 'assistant',
  },
];

const CASES: {
  title: string;
  subtitle: string;
  body: string;
  points: string[];
  preview: 'member' | 'door' | 'cash';
}[] = [
  {
    title: 'Mostrador',
    subtitle: 'El panel de tu equipo',
    body: 'Es la operación de todos los días: alta, cobro y clases. No es un CRM aparte ni una planilla.',
    points: [
      'Dan de alta socios y arman las ofertas: mensualidad, clases sueltas o pack de créditos.',
      'Cobran en el mostrador (efectivo) o mandan el pago a Mercado Pago de la cuenta del negocio.',
      'Arman las clases con horario, cupo y quién reservó.',
    ],
    preview: 'cash',
  },
  {
    title: 'Puerta',
    subtitle: 'Acceso con QR',
    body: 'La puerta no es un molinete suelto: pregunta a la misma operación.',
    points: [
      'El socio presenta el QR de la app, no una foto.',
      'Si no entra, el motivo es legible: deuda, sin pack vigente, sin reserva.',
      'El historial del día queda en el panel, no en un cuaderno.',
    ],
    preview: 'door',
  },
  {
    title: 'App del socio',
    subtitle: 'La cuenta en el celular',
    body: 'El socio no depende de que le reenvíen el estado por WhatsApp.',
    points: [
      'Ve qué contrató, si está al día y hasta cuándo vence.',
      'Ve el calendario de clases y puede tomar una clase suelta si el local lo ofrece.',
      'Lleva la credencial para la puerta.',
    ],
    preview: 'member',
  },
];

function PillarIcon({ name }: { name: (typeof PILLARS)[number]['icon'] }) {
  if (name === 'assistant') return <NavIconAssistant />;
  if (name === 'door') return <NavIconDoor />;
  return <NavIconPeople />;
}

/**
 * Landing Faciliter: hero, pilares, producto explicado, plan y prueba del asistente.
 */
export function LandingPage() {
  const site = publicSiteUrl();
  const mailHref = `mailto:${MARKETING_MAIL}?subject=${encodeURIComponent('Agendar reunión Faciliter')}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Faciliter',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Faciliter Brain: sistema de afiliaciones para gyms, clubes y estudios. Cobros en línea y en efectivo, app del afiliado, puerta y asistente.',
    url: site,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      url: `${site}#precio`,
    },
    areaServed: { '@type': 'Country', name: 'Argentina' },
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MktShell as="section" className="mkt-hero">
        <div className="mkt-hero-copy">
          <p className="mkt-kicker">Faciliter Brain</p>
          <h1>
            El cerebro de tus{' '}
            <span className="accent-text">afiliados</span>.
          </h1>
          <p className="mkt-lead">
            Manejá tu negocio desde Faciliter Brain: afiliados, cobros, puerta
            y app, para gyms, clubes, estudios y cualquier operación con socios.
            Los registros los ves en el panel o se los preguntás al asistente.
          </p>
          <div className="mkt-hero-actions">
            <a className="mkt-btn-primary" href={mailHref}>
              Agendá una reunión
            </a>
            <Link className="mkt-btn-ghost" href="/docs">
              Guía de uso
            </Link>
          </div>
        </div>
        <PhoneFrame>
          <AppHomeMock />
        </PhoneFrame>
      </MktShell>

      <section className="mkt-inner mkt-section-tight">
        <ul className="mkt-features">
          {PILLARS.map((item) => (
            <li key={item.title} className="mkt-pillar">
              <span className="mkt-icon-box" aria-hidden="true">
                <PillarIcon name={item.icon} />
              </span>
              <h2>{item.title}</h2>
              <p className="muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="producto" className="mkt-inner mkt-section">
        <p className="eyebrow">Un solo producto</p>
        <h2 className="mkt-h2">Mostrador, puerta y app, la misma operación</h2>
        <p className="mkt-section-lead">
          Quien trabaja en el local opera en el panel. El socio se gestiona en
          la app. Si puede entrar o no se decide con los mismos datos en todos
          lados: deuda, oferta vigente y reserva cuando hace falta. El producto
          es el mismo para un gym, un club o un estudio.
        </p>
        <ul className="mkt-usecases">
          {CASES.map((item) => (
            <li key={item.title}>
              <h3 className="mkt-case-title">{item.title}</h3>
              <p className="mkt-case-sub">{item.subtitle}</p>
              <p className="mkt-case-body">{item.body}</p>
              <CheckList items={item.points} />
              <ProductPreviewCard kind={item.preview} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Servicios</p>
        <h2 className="mkt-h2">Armás los servicios. El sistema se adapta.</h2>
        <p className="mkt-section-lead">
          Cualquier negocio de afiliaciones: gym, club, estudio u otro. No
          venís a encajar en un software de gym. Creás los servicios que
          ofrecés. Un servicio puede ser mensual (cuota, acceso, pack que se
          renueva) o de una sola vez (clase suelta, pack de créditos, lo que
          definas). El pack es eso: la oferta que el afiliado contrata.
          Faciliter lleva quién lo tiene, si está vigente y qué le da derecho
          a hacer.
        </p>
      </section>

      <section className="mkt-inner mkt-section">
        <p className="eyebrow">App</p>
        <h2 className="mkt-h2">Una app para el afiliado. La misma credencial para la puerta.</h2>
        <p className="mkt-section-lead">
          El afiliado entra a su cuenta: packs contratados, pagos realizados,
          estado de la cuenta. Desde ahí compra lo que el establecimiento ofrece
          en la tienda (hoy servicios; productos físicos, próximamente). Más
          adelante, noticias y avisos del local. Esa app es también la
          credencial de acceso. No hace falta otro carnet ni una captura de
          pantalla.
        </p>
      </section>

      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Puerta</p>
        <h2 className="mkt-h2">El personal ve quién entra. Queda el registro.</h2>
        <p className="mkt-section-lead">
          En la puerta, el staff del lugar ve y registra los ingresos. Ejemplo:
          hay una clase de pilates o de funcional; el afiliado se presenta con
          la app justo para esa clase. Eso se ve en los registros de puerta. La
          regla es simple: solo entra quien tiene un servicio activo, o quien el
          personal autoriza a mano.
        </p>
      </section>

      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Caja</p>
        <h2 className="mkt-h2">Cobros en línea y efectivo, en el mismo sistema.</h2>
        <p className="mkt-section-lead">
          Lo que se cobra online (incluido el débito cuando el afiliado lo
          tiene activo) y lo que se cobra en efectivo en el mostrador viven en
          Brain. El personal cierra el día en caja. Vos ves los registros en el
          panel, o se los preguntás al asistente.
        </p>
      </section>

      <section id="asistente" className="mkt-inner mkt-section">
        <p className="eyebrow">Asistente</p>
        <h2 className="mkt-h2">Probá el asistente</h2>
        <p className="mkt-section-lead">
          La burbuja abajo a la derecha es la misma que en el panel: preguntale
          cómo funciona Faciliter (packs, caja, puerta, app, débito, staff).
          Esta prueba no ve datos de un gym real. En el Admin, consulta la
          operación de tu local. Puede equivocarse; no cobra ni cambia nada
          solo.
        </p>
      </section>

      <section id="precio" className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Plan</h2>
        <p className="mkt-section-lead">
          Un plan, a convenir según el tamaño del gym, club o estudio. Lo que
          paga el socio va a tu Mercado Pago o lo registrás en caja si cobrás
          en el mostrador. Cursos a distancia y tienda de productos no están
          en este corte: van después.
        </p>
        <div className="mkt-plan">
          <p className="eyebrow">Incluye</p>
          <h3>Faciliter Brain</h3>
          <p className="mkt-price">A convenir</p>
          <p className="muted">
            Packs de servicios mensuales y de una vez. Tienda de productos y
            noticias del local, más adelante.
          </p>
          <CheckList
            items={[
              'Panel para tu equipo: socios, ofertas (packs), caja del día, clases y puerta',
              'App para que el socio vea su cuenta, reserve y entre',
              'Mercado Pago del negocio y efectivo, con cierre de caja',
              'Asistente de consulta en el panel: lee la operación; no cobra ni cambia datos solo',
            ]}
          />
          <a className="mkt-btn-primary" href={mailHref}>
            Agendá una reunión
          </a>
        </div>
      </section>

      <section className="mkt-inner mkt-section-tight">
        <div className="mkt-cta-panel">
          <div>
            <h2 className="mkt-h2">Empezá con tu operación</h2>
            <p className="muted">
              Si tu negocio trabaja con afiliados y querés ver si Faciliter
              Brain cierra con cómo cobrás y cómo dejás entrar, agendá una
              reunión.
            </p>
          </div>
          <div className="mkt-hero-actions">
            <a className="mkt-btn-primary" href={mailHref}>
              Agendá una reunión
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
