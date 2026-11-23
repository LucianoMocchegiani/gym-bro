import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CredentialOffer, CredentialOfferStatus, Prisma } from '@prisma/client';
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaHttpError } from './http-kuatia-admin.adapter';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';
import {
  KuatiaPackSyncService,
  packKuatiaIds,
} from './kuatia-pack-sync.service';

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
