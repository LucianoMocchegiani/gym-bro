import { AdsService } from './ads.service';

describe('AdsService', () => {
  const activeTenant: { id: string; status: string } = {
    id: 'tenant-id',
    status: 'ACTIVE',
  };
  const findTenant = jest.fn<
    Promise<{ id: string; status: string } | null>,
    [Record<string, unknown>]
  >();
  const findFirst = jest.fn<
    Promise<{ id: string } | null>,
    [Record<string, unknown>]
  >();
  const findMany = jest.fn<
    Promise<Array<{ id: string }>>,
    [Record<string, unknown>]
  >();
  const createEvent = jest.fn<
    Promise<{ id: string }>,
    [Record<string, unknown>]
  >();
  const prisma = {
    tenant: { findUnique: findTenant },
    adCampaign: {
      findFirst,
      findMany,
      create: jest.fn(),
      update: jest.fn(),
    },
    adEvent: { create: createEvent, groupBy: jest.fn() },
  };
  const service = new AdsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('delivers up to four active campaigns to an active tenant in the requested placement', async () => {
    findTenant.mockResolvedValue(activeTenant);
    const campaigns = Array.from({ length: 4 }, (_, i) => ({
      id: `campaign-${i}`,
    }));
    findMany.mockResolvedValue(campaigns);
    await expect(service.serve('gym-a', 'DASHBOARD')).resolves.toEqual(
      campaigns,
    );
    const query = findMany.mock.calls[0]?.[0];
    expect(query).toMatchObject({
      where: {
        active: true,
        placements: { has: 'DASHBOARD' },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
    const where = query?.where as {
      startsAt: { lte: Date };
      endsAt: { gt: Date };
    };
    expect(where.startsAt.lte).toBeInstanceOf(Date);
    expect(where.endsAt.gt).toBeInstanceOf(Date);
  });

  it('records events with tenant and campaign IDs only, never a member identity', async () => {
    findTenant.mockResolvedValue(activeTenant);
    findFirst.mockResolvedValue({ id: 'campaign-id' });
    await service.track({
      tenantSlug: 'gym-a',
      campaignId: '4ee9b4fc-0210-4e9f-a860-4240fd8f4ae2',
      placement: 'MEMBER_PORTAL',
      type: 'IMPRESSION',
    });
    expect(createEvent).toHaveBeenCalledWith({
      data: {
        campaignId: 'campaign-id',
        tenantId: 'tenant-id',
        placement: 'MEMBER_PORTAL',
        type: 'IMPRESSION',
      },
    });
  });
});
