import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { SiteHeroView, SiteSlideView } from '@/components/gym-site/site/SiteViews';
import { Carousel } from '@/components/marketing/Carousel';
import { MktShell } from '@/components/marketing/MktShell';
import { PackPlanCard } from '@/components/marketing/PackPlanCard';
import {
  storePackItems,
  type PublicTenantCatalog,
} from '@/lib/api/public-tenant-catalog';
import type { SiteButton, SiteSlider } from '@/lib/api/tenant-site';
import { siteButtonLink } from '@/lib/site-buttons';

function HeroActions() {
  return (
    <>
      <a className="mkt-btn-primary" href="#planes">
        Ver planes
      </a>
      <a className="mkt-btn-ghost" href="/login?next=/portal">
        Ya soy socio
      </a>
    </>
  );
}

function SlideButton({
  button,
  packIds,
  onlineCheckout,
}: {
  button: SiteButton;
  packIds: ReadonlySet<string>;
  onlineCheckout: boolean;
}) {
  const link = siteButtonLink(button, packIds, onlineCheckout);
  if (!link) {
    return null;
  }
  return (
    <a
      className="mkt-btn-primary"
      href={link.href}
      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {button.label}
    </a>
  );
}

function SliderSection({
  slider,
  position,
  packIds,
  onlineCheckout,
}: {
  slider: SiteSlider;
  position: number;
  packIds: ReadonlySet<string>;
  onlineCheckout: boolean;
}) {
  return (
    <section className="mkt-inner mkt-section-tight">
      {slider.title ? <h2 className="mkt-h2">{slider.title}</h2> : null}
      <Carousel
        className="site-slider"
        label={slider.title ?? `Novedades ${position}`}
        items={slider.slides.map((slide) => ({
          id: slide.id,
          label: slide.title,
          content: (
            <SiteSlideView
              slide={slide}
              button={
                slide.button ? (
                  <SlideButton
                    button={slide.button}
                    packIds={packIds}
                    onlineCheckout={onlineCheckout}
                  />
                ) : null
              }
            />
          ),
        }))}
      />
    </section>
  );
}

/**
 * Vidriera del gym: portada, sliders (si el gym armó su web, RN-CTA-010) y
 * packs. Comprar online solo si tiene Mercado Pago.
 */
export function GymLandingPage({ catalog }: { catalog: PublicTenantCatalog }) {
  const { tenant, packs, onlineCheckout, site } = catalog;
  const packIds = new Set(packs.map((p) => p.id));
  return (
    <GymSiteShell slug={tenant.slug} gymName={tenant.name}>
      {site ? (
        <MktShell as="section" className="site-hero-section">
          <SiteHeroView hero={site.hero} actions={<HeroActions />} />
        </MktShell>
      ) : (
        <MktShell as="section" className="mkt-hero">
          <div className="mkt-hero-copy">
            <p className="mkt-kicker">Planes y precios</p>
            <h1>{tenant.name}</h1>
            <p className="mkt-lead">
              {onlineCheckout
                ? 'Elegí tu plan y pagalo online con Mercado Pago. Queda activo apenas se acredita.'
                : 'Elegí tu plan y contratalo en el mostrador del gym.'}
            </p>
            <div className="mkt-hero-actions">
              <HeroActions />
            </div>
          </div>
        </MktShell>
      )}

      {site?.sliders.map((slider, i) => (
        <SliderSection
          key={slider.id}
          slider={slider}
          position={i + 1}
          packIds={packIds}
          onlineCheckout={onlineCheckout}
        />
      ))}

      <section id="planes" className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Planes</h2>
        {packs.length === 0 ? (
          <p className="muted">Todavía no hay planes publicados.</p>
        ) : (
          <div className="mkt-plans">
            {packs.map((pack) => (
              <PackPlanCard
                key={pack.id}
                name={pack.name}
                price={pack.price}
                billingPeriod={pack.billingPeriod}
                description={pack.description}
                items={storePackItems(pack)}
                action={
                  onlineCheckout ? (
                    <a
                      className="mkt-btn-primary"
                      href={`/comprar?pack=${encodeURIComponent(pack.id)}`}
                    >
                      Comprar
                    </a>
                  ) : (
                    <p className="muted small">Se contrata en el gym.</p>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </GymSiteShell>
  );
}
