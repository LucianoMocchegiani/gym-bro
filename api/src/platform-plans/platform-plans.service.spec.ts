import { PlatformPlansService } from './platform-plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('PlatformPlansService', () => {
  const prisma = {
    tenant: { findUnique: jest.fn() },
    contract: { findFirst: jest.fn() },
    pack: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    platformPlanModule: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const service = new PlatformPlansService(
    prisma as unknown as PrismaService,
    {} as AuditService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('keeps legacy tenants on Club when they have no platform contract', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'gym-1', slug: 'gym' }).mockResolvedValueOnce({ id: 'admin' });
    prisma.contract.findFirst.mockResolvedValue(null);

    await expect(service.getTenantModules('gym-1')).resolves.toEqual(['club']);
  });

  it('returns modules only from a platform plan belonging to admin', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'gym-1', slug: 'gym' }).mockResolvedValueOnce({ id: 'admin' });
    prisma.contract.findFirst.mockResolvedValueOnce({ packId: 'pack-1' });
    prisma.pack.findUnique.mockResolvedValue({ tenantId: 'admin' });
    prisma.platformPlanModule.findUnique.mockResolvedValue({ modules: ['ecommerce'] });

    await expect(service.getTenantModules('gym-1')).resolves.toEqual(['ecommerce']);
  });

  it('fails closed when an admin plan has no module configuration', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'gym-1', slug: 'gym' }).mockResolvedValueOnce({ id: 'admin' });
    prisma.contract.findFirst.mockResolvedValueOnce({ packId: 'pack-1' });
    prisma.pack.findUnique.mockResolvedValue({ tenantId: 'admin' });
    prisma.platformPlanModule.findUnique.mockResolvedValue(null);

    await expect(service.getTenantModules('gym-1')).resolves.toEqual([]);
  });
});
