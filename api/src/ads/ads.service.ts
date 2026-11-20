import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { AD_PLACEMENTS, SaveAdCampaignDto, TrackAdEventDto } from './ads.dto';

const AD_CAMPAIGN_ORDER_FIELDS = ['createdAt'] as const;

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async serve(tenantSlug: string, placement: string) {
    if (
      !/^[a-z0-9-]{1,60}$/.test(tenantSlug) ||
      !AD_PLACEMENTS.includes(placement as (typeof AD_PLACEMENTS)[number])
    ) {
      throw new NotFoundException();
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundException();
    const now = new Date();
    return this.prisma.adCampaign.findMany({
      where: {
        active: true,
        placements: { has: placement },
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        body: true,
        imageUrl: true,
        targetUrl: true,
      },
    });
  }

  async track(dto: TrackAdEventDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundException();
    const now = new Date();
    const campaign = await this.prisma.adCampaign.findFirst({
      where: {
        id: dto.campaignId,
        active: true,
        placements: { has: dto.placement },
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException();
    // shortcut: event counts are indicative; add deduplication/rate limits before using metrics for billing.
    await this.prisma.adEvent.create({
      data: {
        campaignId: campaign.id,
        tenantId: tenant.id,
        placement: dto.placement,
        type: dto.type,
      },
    });
    return { recorded: true };
  }

  async list(
    query: ListQueryDto = {},
  ): Promise<ListResult<Record<string, unknown>>> {
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      AD_CAMPAIGN_ORDER_FIELDS,
      'createdAt',
    );
    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.adCampaign.findMany({
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.adCampaign.count(),
    ]);
    const events = campaigns.length
      ? await this.prisma.adEvent.groupBy({
          by: ['campaignId', 'type'],
          where: {
            campaignId: { in: campaigns.map((campaign) => campaign.id) },
          },
          _count: { _all: true },
        })
      : [];
    return toListResult(
      campaigns.map((campaign) => ({
        ...campaign,
        impressions:
          events.find(
            (event) =>
              event.campaignId === campaign.id && event.type === 'IMPRESSION',
          )?._count._all ?? 0,
        clicks:
          events.find(
            (event) =>
              event.campaignId === campaign.id && event.type === 'CLICK',
          )?._count._all ?? 0,
      })),
      total,
      n.page,
      n.pageSize,
    );
  }

  create(dto: SaveAdCampaignDto) {
    return this.prisma.adCampaign.create({ data: this.campaignData(dto) });
  }

  update(id: string, dto: SaveAdCampaignDto) {
    return this.prisma.adCampaign.update({
      where: { id },
      data: this.campaignData(dto),
    });
  }

  private campaignData(dto: SaveAdCampaignDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt || dto.placements.length === 0) {
      throw new BadRequestException(
        'La vigencia o las ubicaciones de la campaña no son válidas',
      );
    }
    return {
      name: dto.name.trim(),
      body: dto.body.trim(),
      imageUrl: dto.imageUrl,
      targetUrl: dto.targetUrl,
      startsAt,
      endsAt,
      active: dto.active,
      placements: [...new Set(dto.placements)],
    };
  }
}
