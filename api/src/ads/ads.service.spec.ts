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
  const countCampaigns = jest.fn<Promise<number>, []>();
  const groupEvents = jest.fn();
  const createEvent = jest.fn<
    Promise<{ id: string }>,
    [Record<string, unknown>]
  >();
  const transaction = jest.fn(async (queries: Promise<unknown>[]) =>
    Promise.all(queries),
  );
  const prisma = {
    $transaction: transaction,
    tenant: { findUnique: findTenant },
    adCampaign: {
      findFirst,
      findMany,
      count: countCampaigns,
      create: jest.fn(),
      update: jest.fn(),
    },
    adEvent: { create: createEvent, groupBy: groupEvents },
  };
  const service = new AdsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('delivers all active campaigns to an active tenant in the requested placement', async () => {
    findTenant.mockResolvedValue(activeTenant);
    const campaigns = Array.from({ length: 6 }, (_, i) => ({
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
    });
    expect(query).not.toHaveProperty('take');
    const where = query?.where as {
      startsAt: { lte: Date };
      endsAt: { gt: Date };
    };
    expect(where.startsAt.lte).toBeInstanceOf(Date);
    expect(where.endsAt.gt).toBeInstanceOf(Date);
  });

  it('returns campaigns using the shared server-pagination contract', async () => {
    const campaigns = [{ id: 'campaign-1' }];
    findMany.mockResolvedValue(campaigns);
    countCampaigns.mockResolvedValue(21);
    groupEvents.mockResolvedValue([
      {
        campaignId: 'campaign-1',
        type: 'IMPRESSION',
        _count: { _all: 5 },
      },
    ]);

    await expect(service.list({ page: 2, pageSize: 10 })).resolves.toEqual({
      items: [{ id: 'campaign-1', impressions: 5, clicks: 0 }],
      page: 2,
      pageSize: 10,
      total: 21,
      hasMore: true,
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(groupEvents).toHaveBeenCalledWith({
      by: ['campaignId', 'type'],
      where: { campaignId: { in: ['campaign-1'] } },
      _count: { _all: true },
    });
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
