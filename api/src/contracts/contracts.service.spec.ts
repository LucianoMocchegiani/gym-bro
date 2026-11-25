import { BillingPeriod, ServiceType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditActor } from '../audit/audit.types';
import { CredentialIssuerPort } from '../access-providers/credential-issuer.port';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from './contracts.service';

describe('ContractsService pack activation', () => {
  it('routes approved Caja and Mercado Pago packs through the same activation flow', async () => {
    const prisma = {
      transactionItem: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'mp-item',
            memberId: 'member-1',
            status: 'APPROVED',
            method: 'MP',
            packId: 'pack-1',
            contract: null,
            pack: { id: 'pack-1', components: [{}] },
            transaction: null,
          })
          .mockResolvedValueOnce({
            id: 'cash-item',
            memberId: 'member-1',
            status: 'APPROVED',
            method: 'CASH',
            packId: 'pack-1',
            contract: null,
            pack: { id: 'pack-1', components: [{}] },
            transaction: null,
          }),
      },
    } as unknown as PrismaService;
    const service = new ContractsService(
      prisma,
      {} as AuditService,
      {} as CredentialIssuerPort,
    );
    const activate = jest.fn().mockResolvedValue({});
    Object.defineProperty(service, 'activateApprovedPack', { value: activate });
    const actor: AuditActor = { profileType: 'MEMBER', userId: 'member-1' };

    await service.confirmFromApprovedPayment('tenant-1', 'mp-item', actor);
    await service.createFromTransactionItem('tenant-1', 'cash-item', actor);

    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('gives a ONE_TIME pack one month by default, independent of any recurring charge', async () => {
    const service = new ContractsService(
      {} as PrismaService,
      {} as AuditService,
      {} as CredentialIssuerPort,
    );
    const startsAt = new Date('2026-01-15T12:00:00.000Z');
    const plan = await service['resolveContractPlan'](
      'tenant-1',
      'member-1',
      {
        id: 'pack-1',
        name: 'Single purchase',
        price: 100,
        billingPeriod: BillingPeriod.ONE_TIME,
        creditsExpireAt: null,
        components: [
          {
            serviceId: 'service-1',
            creditAmount: null,
            service: {
              id: 'service-1',
              name: 'Access',
              type: ServiceType.ACCESO_LIBRE,
              active: true,
            },
          },
        ],
      },
      { startsAt },
    );
    const expectedEnd = new Date(startsAt);
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);

    expect(plan.endsAt).toEqual(expectedEnd);
    expect(plan.hasAccessLibre).toBe(true);
  });
});
