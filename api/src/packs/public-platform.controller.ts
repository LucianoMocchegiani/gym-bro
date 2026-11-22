import { Controller, Get } from '@nestjs/common';
import { PackLandingVisibilityService } from './pack-landing-visibility.service';
import { PacksService } from './packs.service';
import { PublicPlatformPack } from './packs.types';

/**
 * Catálogo de packs del tenant `admin` para la landing.
 *
 * @remarks Sin auth. No cobra ni crea gyms.
 */
@Controller('public/platform')
export class PublicPlatformController {
  constructor(
    private readonly packs: PacksService,
    private readonly visibility: PackLandingVisibilityService,
  ) {}

  @Get('packs')
  async listPacks(): Promise<PublicPlatformPack[]> {
    const [packs, visibleIds] = await Promise.all([
      this.packs.listPublicPlatformPacks(),
      this.visibility.visiblePlatformPackIds(),
    ]);
    return packs.filter(({ id }) => visibleIds.has(id));
  }
}
