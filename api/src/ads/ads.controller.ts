import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { AdsService } from './ads.service';
import { SaveAdCampaignDto, TrackAdEventDto } from './ads.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  @Get('serve/:tenantSlug/:placement')
  serve(
    @Param('tenantSlug') tenantSlug: string,
    @Param('placement') placement: string,
  ) {
    return this.ads.serve(tenantSlug, placement);
  }

  @Post('events')
  track(@Body() dto: TrackAdEventDto) {
    return this.ads.track(dto);
  }

  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Get('campaigns')
  list() {
    return this.ads.list();
  }

  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Post('campaigns')
  create(@Body() dto: SaveAdCampaignDto) {
    return this.ads.create(dto);
  }

  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Patch('campaigns/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAdCampaignDto,
  ) {
    return this.ads.update(id, dto);
  }
}
