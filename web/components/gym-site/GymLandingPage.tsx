import { GymSiteShell } from '@/components/gym-site/GymSiteShell';
import { MktShell } from '@/components/marketing/MktShell';
import { PackPlanCard } from '@/components/marketing/PackPlanCard';
import {
  storeComponentLabel,
  type PublicTenantCatalog,
  type StorePack,
} from '@/lib/api/public-tenant-catalog';

function packItems(pack: StorePack): string[] {
  const items = pack.components.map(storeComponentLabel);
  if (pack.creditsExpireAt) {
    items.push(
      `Créditos vencen el ${new Date(pack.creditsExpireAt).toLocaleDateString('es-AR')}`,
    );
  }
  return items;
}

/**
 * Vidriera del gym: nombre y packs. Comprar online solo si tiene Mercado Pago.
 */
export function GymLandingPage({ catalog }: { catalog: PublicTenantCatalog }) {
  const { tenant, packs, onlineCheckout } = catalog;
  return (
    <GymSiteShell slug={tenant.slug} gymName={tenant.name}>
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
            <a className="mkt-btn-primary" href="#planes">
              Ver planes
            </a>
            <a className="mkt-btn-ghost" href="/login?next=/cuenta">
              Ya soy socio
            </a>
          </div>
        </div>
      </MktShell>

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
                items={packItems(pack)}
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
