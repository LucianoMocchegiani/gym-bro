import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  ContractType,
  PlatformSignupStatus,
} from '@prisma/client';
import type { AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { PrismaService } from '../prisma/prisma.service';

export type IdentityPlanActionsView = {
  automaticDebit: 'active' | 'cancelled' | 'none' | 'unknown';
  canFinalize: boolean;
  finalizationAt: string | null;
};

@Injectable()
export class IdentityPlanCancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly audit: AuditService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  async get(
    identityId: string,
    tenantId: string,
  ): Promise<IdentityPlanActionsView> {
    await this.requireOwnedTenant(identityId, tenantId);
    return this.getActions(identityId, tenantId);
  }

  async getForTenant(tenantId: string): Promise<IdentityPlanActionsView> {
    return this.getActions(await this.ownerIdentityId(tenantId), tenantId);
  }

  async cancelAutomaticDebit(identityId: string, tenantId: string) {
    await this.requireOwnedTenant(identityId, tenantId);
    return this.cancelDebit(tenantId, identityId, this.identityActor(identityId));
  }

  async cancelAutomaticDebitForStaff(staffId: string, tenantId: string) {
    const identityId = await this.ownerIdentityId(tenantId);
    return this.cancelDebit(tenantId, identityId, {
      profileType: 'STAFF',
      userId: staffId,
    });
  }

  async finalizePlan(identityId: string, tenantId: string) {
    await this.requireOwnedTenant(identityId, tenantId);
    return this.finalize(tenantId, identityId, this.identityActor(identityId));
  }

  async finalizePlanForStaff(staffId: string, tenantId: string) {
    const identityId = await this.ownerIdentityId(tenantId);
    return this.finalize(tenantId, identityId, {
      profileType: 'STAFF',
      userId: staffId,
    });
  }

  private async getActions(
    identityId: string,
    tenantId: string,
  ): Promise<IdentityPlanActionsView> {
    const contract = await this.currentContract(tenantId);
    // shortcut: finalización se deriva de auditoría, no del contrato; migrar a estado propio al modelar suscripciones de plataforma.
    const finalized = contract
      ? await this.prisma.auditEvent.findFirst({
          where: {
            tenantId,
            entityType: 'contract',
            entityId: contract.id,
            action: 'platform.plan.finalize',
          },
          select: { id: true },
        })
      : null;
    const signup = await this.findSignup(identityId, tenantId);
    let automaticDebit: IdentityPlanActionsView['automaticDebit'] = signup
      ? 'unknown'
      : 'none';
    if (signup?.mpPreapprovalId) {
      const cancelled = await this.prisma.auditEvent.findFirst({
        where: {
          tenantId,
          entityType: 'platform_signup',
          entityId: signup.id,
          action: 'platform.plan.automatic_debit.cancel',
        },
        select: { id: true },
      });
      if (cancelled) {
        automaticDebit = 'cancelled';
      } else {
        try {
          const remote = await this.mp.getPreapproval(
            await this.adminAccessToken(),
            signup.mpPreapprovalId,
          );
          automaticDebit = ['cancelled', 'paused', 'rejected'].includes(
            remote.status,
          )
            ? 'cancelled'
            : 'active';
        } catch {
          automaticDebit = 'unknown';
        }
      }
    }
    return {
      automaticDebit,
      canFinalize: Boolean(contract?.endsAt),
      finalizationAt:
        finalized && contract?.endsAt ? contract.endsAt.toISOString() : null,
    };
  }

  private async cancelDebit(
    tenantId: string,
    identityId: string,
    actor: AuditActor,
  ) {
    const signup = await this.findSignup(identityId, tenantId);
    if (!signup?.mpPreapprovalId) {
      throw new BadRequestException('No hay un débito automático asociado');
    }
    await this.stopPreapproval(signup.mpPreapprovalId);
    await this.audit.record({
      tenantId,
      actor,
      action: 'platform.plan.automatic_debit.cancel',
      entityType: 'platform_signup',
      entityId: signup.id,
      after: { preapprovalId: signup.mpPreapprovalId },
    });
    return this.getActions(identityId, tenantId);
  }

  private async finalize(
    tenantId: string,
    identityId: string,
    actor: AuditActor,
  ) {
    const contract = await this.currentContract(tenantId);
    if (!contract?.endsAt) {
      throw new BadRequestException('No hay un plan vigente con vencimiento');
    }
    const alreadyFinalized = await this.prisma.auditEvent.findFirst({
      where: {
        tenantId,
        entityType: 'contract',
        entityId: contract.id,
        action: 'platform.plan.finalize',
      },
      select: { id: true },
    });
    if (!alreadyFinalized) {
      const signup = await this.findSignup(identityId, tenantId);
      if (signup?.mpPreapprovalId) {
        await this.stopPreapproval(signup.mpPreapprovalId);
        await this.audit.record({
          tenantId,
          actor,
          action: 'platform.plan.automatic_debit.cancel',
          entityType: 'platform_signup',
          entityId: signup.id,
          after: {
            preapprovalId: signup.mpPreapprovalId,
            reason: 'plan_finalize',
          },
        });
      }
      await this.audit.record({
        tenantId,
        actor,
        action: 'platform.plan.finalize',
        entityType: 'contract',
        entityId: contract.id,
        after: { effectiveAt: contract.endsAt.toISOString() },
      });
    }
    return this.getActions(identityId, tenantId);
  }

  private async stopPreapproval(preapprovalId: string): Promise<void> {
    const token = await this.adminAccessToken();
    const remote = await this.mp.getPreapproval(token, preapprovalId);
    if (!['cancelled', 'paused', 'rejected'].includes(remote.status)) {
      await this.mp.cancelPreapproval(token, preapprovalId);
    }
  }

  private async adminAccessToken(): Promise<string> {
    const admin = await this.prisma.tenant.findUnique({
      where: { slug: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException('Tenant de plataforma no configurado');
    }
    return this.accounts.getDecryptedAccessToken(admin.id);
  }

  private async ownerIdentityId(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ownerIdentityId: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    if (!tenant.ownerIdentityId) {
      throw new BadRequestException('El tenant no tiene una cuenta dueña');
    }
    return tenant.ownerIdentityId;
  }

  private async findSignup(identityId: string, tenantId: string) {
    return this.prisma.platformSignup.findFirst({
      where: {
        identityId,
        tenantId,
        status: PlatformSignupStatus.COMPLETED,
        mpPreapprovalId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, mpPreapprovalId: true },
    });
  }

  private async currentContract(tenantId: string) {
    const now = new Date();
    return this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractType: ContractType.TENANT,
        status: ContractStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { startsAt: 'desc' },
      select: { id: true, endsAt: true },
    });
  }

  private async requireOwnedTenant(identityId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, ownerIdentityId: identityId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
  }

  private identityActor(identityId: string): AuditActor {
    return { profileType: 'IDENTITY', userId: identityId };
  }
}
