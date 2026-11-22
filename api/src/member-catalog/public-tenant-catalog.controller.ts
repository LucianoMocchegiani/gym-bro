import { Controller, Get, Param } from '@nestjs/common';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { PackLandingVisibilityService } from '../packs/pack-landing-visibility.service';
import { PacksService } from '../packs/packs.service';
import { TenantSiteService } from '../tenant-site/tenant-site.service';
import { TenantsService } from '../tenants/tenants.service';
import { PublicTenantCatalog } from './member-catalog.types';

/**
 * Web pública del gym (`{slug}/`): packs y contenido editable.
 *
 * @remarks Sin auth. `site` = hero y sliders del gym (RN-CTA-010); null = vidriera por defecto.
 */
@Controller('public/tenants')
export class PublicTenantCatalogController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly packs: PacksService,
    private readonly visibility: PackLandingVisibilityService,
    private readonly mp: MercadoPagoAccountService,
    private readonly site: TenantSiteService,
  ) {}

  @Get('by-slug/:slug/packs')
  async listPacks(@Param('slug') slug: string): Promise<PublicTenantCatalog> {
    const tenant = await this.tenants.findPublicBySlug(slug);
    const [packs, visibleIds, mp, site] = await Promise.all([
      this.packs.listForMember(tenant.id),
      this.visibility.visiblePackIds(tenant.id),
      this.mp.getStatus(tenant.id),
      this.site.getPublicContent(tenant.id),
    ]);
    return {
      tenant: { name: tenant.name, slug: tenant.slug },
      onlineCheckout: mp.connected,
      packs: packs.filter(({ id }) => visibleIds.has(id)),
      site,
    };
  }
}
