import { Controller, Get, Param } from '@nestjs/common';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { PacksService } from '../packs/packs.service';
import { TenantsService } from '../tenants/tenants.service';
import { PublicTenantCatalog } from './member-catalog.types';

/**
 * Packs del gym para su landing pública (`{slug}/`).
 *
 * @remarks Sin auth. Mismos packs que la tienda del afiliado (`GET /me/packs`).
 */
@Controller('public/tenants')
export class PublicTenantCatalogController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly packs: PacksService,
    private readonly mp: MercadoPagoAccountService,
  ) {}

  @Get('by-slug/:slug/packs')
  async listPacks(@Param('slug') slug: string): Promise<PublicTenantCatalog> {
    const tenant = await this.tenants.findPublicBySlug(slug);
    const [packs, mp] = await Promise.all([
      this.packs.listForMember(tenant.id),
      this.mp.getStatus(tenant.id),
    ]);
    return {
      tenant: { name: tenant.name, slug: tenant.slug },
      onlineCheckout: mp.connected,
      packs,
    };
  }
}
