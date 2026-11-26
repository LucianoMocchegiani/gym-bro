import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ContractsService } from '../contracts/contracts.service';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MpAccountPort } from '../payment/mp-account.port';
import type { PrismaService } from '../prisma/prisma.service';
import { IdentityPlanCancellationService } from './identity-plan-cancellation.service';

const identityId = 'identity-1';
const tenantId = 'tenant-1';
const signupId = 'signup-1';
const preapprovalId = 'preapproval-1';
const endsAt = new Date(Date.now() + 86_400_000);

describe('IdentityPlanCancellationService', () => {
  let service: IdentityPlanCancellationService;
  let prisma: {
    tenant: { findFirst: jest.Mock; findUnique: jest.Mock };
    contract: { findFirst: jest.Mock };
    platformSignup: { findFirst: jest.Mock };
    auditEvent: { findFirst: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let contracts: { updateStatus: jest.Mock };
  let mp: { getPreapproval: jest.Mock; cancelPreapproval: jest.Mock };
  let finalizationRecorded: boolean;
  let debitCancellationRecorded: boolean;

  beforeEach(() => {
    finalizationRecorded = false;
    debitCancellationRecorded = false;
    prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: tenantId }),
        findUnique: jest.fn((input: { where: { id?: string; slug?: string } }) =>
          Promise.resolve(
            input.where.slug
              ? { id: 'admin-id' }
              : { id: tenantId, slug: 'test-gym', ownerIdentityId: identityId },
          ),
        ),
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue({ id: 'contract-1', endsAt }),
      },
      platformSignup: {
        findFirst: jest.fn().mockResolvedValue({
          id: signupId,
          mpPreapprovalId: preapprovalId,
        }),
      },
      auditEvent: {
        findFirst: jest.fn((input: { where: { action: string } }) => {
          if (
            input.where.action === 'platform.plan.finalize' &&
            finalizationRecorded
          ) {
            return Promise.resolve({ id: 'finalized' });
          }
          if (
            input.where.action === 'platform.plan.automatic_debit.cancel' &&
            debitCancellationRecorded
          ) {
            return Promise.resolve({ id: 'debit-cancelled' });
          }
          return Promise.resolve(null);
        }),
      },
    };
    audit = {
      record: jest.fn((input: { action: string }) => {
        if (input.action === 'platform.plan.finalize') {
          finalizationRecorded = true;
        }
        if (input.action === 'platform.plan.automatic_debit.cancel') {
          debitCancellationRecorded = true;
        }
      }),
    };
    contracts = {
      updateStatus: jest.fn().mockResolvedValue({ status: 'CANCELLED' }),
    };
    mp = {
      getPreapproval: jest.fn().mockResolvedValue({ status: 'authorized' }),
      cancelPreapproval: jest.fn().mockResolvedValue(undefined),
    };
    service = new IdentityPlanCancellationService(
      prisma as unknown as PrismaService,
      {
        getDecryptedAccessToken: jest.fn().mockResolvedValue('token'),
      } as unknown as MercadoPagoAccountService,
      audit as unknown as AuditService,
      contracts as unknown as ContractsService,
      mp as unknown as MpAccountPort,
    );
  });

  it('cancels renewal but preserves the current contract through its end date', async () => {
    const result = await service.finalizePlan(identityId, tenantId);

    expect(mp.cancelPreapproval).toHaveBeenCalledWith('token', preapprovalId);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'platform.plan.finalize',
        entityId: 'contract-1',
        after: { effectiveAt: endsAt.toISOString() },
      }),
    );
    expect(prisma.contract.findFirst).toHaveBeenCalled();
    expect(result.finalizationAt).toBe(endsAt.toISOString());
  });

  it('cancels debit on behalf of the tenant and audits the staff actor', async () => {
    await service.cancelAutomaticDebitForStaff('staff-1', tenantId);

    expect(mp.cancelPreapproval).toHaveBeenCalledWith('token', preapprovalId);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'platform.plan.automatic_debit.cancel',
        actor: { profileType: 'STAFF', userId: 'staff-1' },
      }),
    );
  });

  it('immediately cancels the tenant contract and its automatic debit when present', async () => {
    await service.cancelPlanImmediatelyByPlatform('platform-staff-1', tenantId, 'test-gym');

    expect(mp.cancelPreapproval).toHaveBeenCalledWith('token', preapprovalId);
    expect(contracts.updateStatus).toHaveBeenCalledWith(
      tenantId,
      'contract-1',
      {
        status: 'CANCELLED',
        reason: 'Baja inmediata por administración Faciliter',
      },
      { profileType: 'STAFF', userId: 'platform-staff-1' },
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'platform.plan.automatic_debit.cancel',
        actor: { profileType: 'STAFF', userId: 'platform-staff-1' },
      }),
    );
  });

  it('cancels the active plan even when the tenant has no automatic debit', async () => {
    prisma.platformSignup.findFirst.mockResolvedValue(null);

    const result = await service.cancelPlanImmediatelyByPlatform(
      'platform-staff-1',
      tenantId,
      'test-gym',
    );

    expect(mp.getPreapproval).not.toHaveBeenCalled();
    expect(contracts.updateStatus).toHaveBeenCalled();
    expect(result.automaticDebitCancelled).toBe(false);
  });

  it('requires the exact tenant slug before cancelling the contract', async () => {
    await expect(
      service.cancelPlanImmediatelyByPlatform('platform-staff-1', tenantId, 'other-gym'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mp.cancelPreapproval).not.toHaveBeenCalled();
    expect(contracts.updateStatus).not.toHaveBeenCalled();
  });

  it('does not cancel a tenant that is not owned by the identity', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(
      service.cancelAutomaticDebit(identityId, tenantId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mp.cancelPreapproval).not.toHaveBeenCalled();
  });
});
