import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { KuatiaAdminPort } from './kuatia-admin.port';
import type { KuatiaEnvService } from './kuatia-env.service';
import { KuatiaOfferService } from './kuatia-offer.service';
import type { KuatiaPackSyncService } from './kuatia-pack-sync.service';

describe('KuatiaOfferService.ensureOfferForCurrentContract', () => {
  it('rejects when the authenticated member has no current contract', async () => {
    const memberFindFirst = jest.fn().mockResolvedValue({ id: 'member-1' });
    const contractFindMany = jest.fn(
      (args: {
        where: { tenantId: string; memberId: string; status: string };
        take: number;
      }) => {
        expect(args).toMatchObject({
          where: {
            tenantId: 'tenant-1',
            memberId: 'member-1',
            status: 'ACTIVE',
          },
          take: 1,
        });
        return Promise.resolve([]);
      },
    );
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
    expect(contractFindMany).toHaveBeenCalledTimes(1);
  });
});
