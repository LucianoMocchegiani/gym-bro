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
  const createEvent = jest.fn<
    Promise<{ id: string }>,
    [Record<string, unknown>]
  >();
  const prisma = {
    tenant: { findUnique: findTenant },
    adCampaign: {
      findFirst,
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adEvent: { create: createEvent, groupBy: jest.fn() },
  };
  const service = new AdsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('delivers only to an active tenant and asks for an active campaign in the requested placement', async () => {
    findTenant.mockResolvedValue(activeTenant);
    findFirst.mockResolvedValue({ id: 'campaign-id' });
    await service.serve('gym-a', 'DASHBOARD');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          placements: { has: 'DASHBOARD' },
          startsAt: { lte: expect.any(Date) },
          endsAt: { gt: expect.any(Date) },
        },
      }),
    );
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
