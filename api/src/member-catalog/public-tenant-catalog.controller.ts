import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/list';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { PackLandingVisibilityService } from '../packs/pack-landing-visibility.service';
import { PacksService } from '../packs/packs.service';
import { PlatformPlansService } from '../platform-plans/platform-plans.service';
import { TenantSiteService } from '../tenant-site/tenant-site.service';
import { TenantsService } from '../tenants/tenants.service';
import { PublicProductsService } from '../products/public-products.service';
import { PublicTenantCatalog } from './member-catalog.types';

/**
 * Web pública del gym (`{slug}/`): packs, productos y contenido editable.
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
    private readonly products: PublicProductsService,
    private readonly plans: PlatformPlansService,
  ) {}

  @Get('by-slug/:slug/packs')
  async listPacks(@Param('slug') slug: string): Promise<PublicTenantCatalog> {
    const tenant = await this.tenants.findPublicBySlug(slug);
    const modules = await this.plans.getTenantModules(tenant.id);
    const hasPlans = modules.includes('club');
    const hasProducts = modules.includes('ecommerce');
    if (!hasPlans && !hasProducts) {
      throw new NotFoundException('Tenant catalog is unavailable');
    }
    const [packs, visibleIds, mp, site] = await Promise.all([
      hasPlans ? this.packs.listForMember(tenant.id) : Promise.resolve([]),
      hasPlans
        ? this.visibility.visiblePackIds(tenant.id)
        : Promise.resolve(new Set<string>()),
      hasPlans
        ? this.mp.getStatus(tenant.id)
        : Promise.resolve({ connected: false }),
      hasPlans ? this.site.getPublicContent(tenant.id) : Promise.resolve(null),
    ]);
    return {
      tenant: { name: tenant.name, slug: tenant.slug },
      onlineCheckout: mp.connected,
      packs: packs.filter(({ id }) => visibleIds.has(id)),
      hasPlans,
      hasProducts,
      site,
    };
  }

  @Get('by-slug/:slug/products')
  async listProducts(
    @Param('slug') slug: string,
    @Query() query: ListQueryDto,
  ) {
    const tenant = await this.tenants.findPublicBySlug(slug);
    if (!(await this.plans.getTenantModules(tenant.id)).includes('ecommerce')) {
      throw new NotFoundException('Product catalog is unavailable');
    }
    return this.products.list(tenant.id, query);
  }
}
