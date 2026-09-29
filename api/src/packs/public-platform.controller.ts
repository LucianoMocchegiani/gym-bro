import { Controller, Get } from '@nestjs/common';
import { PacksService } from './packs.service';
import { PublicPlatformPack } from './packs.types';

/**
 * Catálogo de packs del tenant `admin` para la landing.
 *
 * @remarks Sin auth. No cobra ni crea gyms.
 */
@Controller('public/platform')
export class PublicPlatformController {
  constructor(private readonly packs: PacksService) {}

  @Get('packs')
  listPacks(): Promise<PublicPlatformPack[]> {
    return this.packs.listPublicPlatformPacks();
  }
}
