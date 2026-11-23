import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { KuatiaStaffOfferService } from './kuatia-staff-offer.service';
import type { KuatiaAdminPort } from './kuatia-admin.port';
import type { KuatiaEnvService } from './kuatia-env.service';
import type { KuatiaStaffSyncService } from './kuatia-staff-sync.service';

describe('KuatiaStaffOfferService.ensureOfferForStaff', () => {
  it('does not issue credentials for inactive staff', async () => {
    const findStaff = jest.fn().mockResolvedValue({
      id: 'staff-1',
      name: 'Inactive staff',
      email: 'staff@example.test',
      active: false,
    });
    const prisma = {
      staffUser: { findFirst: findStaff },
      staffCredentialOffer: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const service = new KuatiaStaffOfferService(
      prisma,
      {} as KuatiaAdminPort,
      {} as KuatiaEnvService,
      {} as KuatiaStaffSyncService,
    );

    await expect(
      service.ensureOfferForStaff('tenant-1', 'staff-1', { force: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findStaff).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'staff-1', tenantId: 'tenant-1' } }),
    );
    expect(prisma.staffCredentialOffer.findUnique).not.toHaveBeenCalled();
  });
});
