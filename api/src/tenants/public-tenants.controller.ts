import { Controller, Get, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PublicTenantSummary } from './tenants.types';

/**
 * Resolución pública de tenant por slug (subdominio / login Staff).
 *
 * @remarks Sin auth. No expone owner ni roles.
 */
@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string): Promise<PublicTenantSummary> {
    return this.tenantsService.findPublicBySlug(slug);
  }
}
