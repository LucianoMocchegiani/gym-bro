import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';
import { KuatiaOfferService } from './kuatia-offer.service';
import { KuatiaPackSyncService } from './kuatia-pack-sync.service';

describe('KuatiaOfferService.ensureOfferForCurrentContract', () => {
  it('rejects when the authenticated member has no current contract', async () => {
    const memberFindFirst = jest.fn().mockResolvedValue({ id: 'member-1' });
    const contractFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      member: { findFirst: memberFindFirst },
      contract: { findMany: contractFindMany },
    } as unknown as PrismaService;
    const service = new KuatiaOfferService(
      prisma,
      {} as KuatiaAdminPort,
      {} as KuatiaEnvService,
      {} as KuatiaPackSyncService,
    );

    await expect(
      service.ensureOfferForCurrentContract('tenant-1', 'member-1'),
    ).rejects.toThrow(BadRequestException);
    expect(memberFindFirst).toHaveBeenCalledWith({
      where: { id: 'member-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(contractFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          memberId: 'member-1',
          status: 'ACTIVE',
        }),
        take: 1,
      }),
    );
  });
});
