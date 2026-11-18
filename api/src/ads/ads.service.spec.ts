import { AdsService } from './ads.service';

describe('AdsService', () => {
  const findFirst = jest.fn<
    Promise<{ id: string } | null>,
    [Record<string, unknown>]
  >();
  const prisma = {
    tenant: { findUnique: jest.fn() },
    adCampaign: {
      findFirst,
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adEvent: { create: jest.fn(), groupBy: jest.fn() },
  };
  const service = new AdsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('delivers only to an active tenant and asks for an active campaign in the requested placement', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-id', status: 'ACTIVE' });
    findFirst.mockResolvedValue({ id: 'campaign-id' });
    await service.serve('gym-a', 'DASHBOARD');
    expect(findFirst).toHaveBeenCalled();
    expect(findFirst.mock.calls[0]?.[0]?.where).toEqual({
      active: true,
      placements: { has: 'DASHBOARD' },
      startsAt: { lte: expect.any(Date) },
      endsAt: { gt: expect.any(Date) },
    });
  });

  it('records events with tenant and campaign IDs only, never a member identity', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-id', status: 'ACTIVE' });
    findFirst.mockResolvedValue({ id: 'campaign-id' });
    await service.track({
      tenantSlug: 'gym-a',
      campaignId: '4ee9b4fc-0210-4e9f-a860-4240fd8f4ae2',
      placement: 'MEMBER_PORTAL',
      type: 'IMPRESSION',
    });
    expect(prisma.adEvent.create).toHaveBeenCalledWith({
      data: {
        campaignId: 'campaign-id',
        tenantId: 'tenant-id',
        placement: 'MEMBER_PORTAL',
        type: 'IMPRESSION',
      },
    });
  });
});
