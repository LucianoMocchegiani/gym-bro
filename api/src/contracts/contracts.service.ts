import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingPeriod,
  CashMovementConcept,
  Contract,
  ContractStatus,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptConcept,
  ServiceType,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { CreateContractDto, UpdateContractStatusDto } from './dto/contract.dto';
import { ContractDetail } from './contracts.types';

type ContractWithRelations = Contract & {
  pack: { id: string; name: string };
  payment: {
    id: string;
    amount: number;
    status: PaymentStatus;
    method: PaymentMethod;
    idempotencyKey: string;
  };
  balances: {
    id: string;
    serviceId: string;
    initialAmount: number;
    remaining: number;
    expiresAt: Date | null;
    service: { id: string; name: string };
  }[];
};

type PackForContract = {
  id: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  creditsExpireAt: Date | null;
  components: {
    serviceId: string;
    creditAmount: number | null;
    service: { id: string; name: string; type: ServiceType; active: boolean };
  }[];
};

type ContractPlan = {
  startsAt: Date;
  endsAt: Date | null;
  hasAccessLibre: boolean;
  creditComponents: { serviceId: string; creditAmount: number }[];
};

/**
 * Contrataciones tras pago aprobado y cancelación de derechos.
 *
 * @remarks CU-CON-001 / CU-CON-002 / RN-PAG-004 / RN-SER-009.
 * Pago CASH registra movimiento de caja (RN-PAG-007). Comprobante interno
 * RN-PAG-009. MP confirma vía webhook con {@link confirmFromApprovedPayment}.
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cashRegister: CashRegisterService,
    private readonly receipts: ReceiptsService,
  ) {}

  /**
   * Lista contrataciones de un afiliado del tenant.
   */
  async listByMember(
    tenantId: string,
    memberId: string,
  ): Promise<ContractDetail[]> {
    await this.assertMemberInTenant(tenantId, memberId);
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId, memberId },
      include: this.contractInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((c) => this.toDetail(c));
  }

  /**
   * Detalle de contratación (staff o dueño member).
   */
  async findOne(tenantId: string, contractId: string): Promise<ContractDetail> {
    const contract = await this.findInTenant(tenantId, contractId);
    return this.toDetail(contract);
  }

  /**
   * Cancela una contratación ACTIVE: pierde acceso libre y créditos remanentes.
   *
   * @remarks RN-SER-009 (pack mixto pierde todo). El Payment permanece APPROVED;
   * `REFUNDED` se aplica en E5 con devolución. Idempotente si ya está CANCELLED.
   * @throws {BadRequestException} Si el contrato no está ACTIVE ni CANCELLED.
   */
  async updateStatus(
    tenantId: string,
    contractId: string,
    dto: UpdateContractStatusDto,
    actor: AuditActor,
  ): Promise<ContractDetail> {
    const before = await this.findInTenant(tenantId, contractId);

    if (before.status === ContractStatus.CANCELLED) {
      return this.toDetail(before);
    }
    if (before.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        `Only ACTIVE contracts can be cancelled (current: ${before.status})`,
      );
    }
    if (dto.status !== ContractStatus.CANCELLED) {
      throw new BadRequestException('Only CANCELLED status is supported');
    }

    const reason = dto.reason?.trim() || null;
    const beforeSnapshot = this.auditSnapshot(this.toDetail(before));

    const contract = await this.prisma.$transaction(async (tx) => {
      await tx.contractCreditBalance.updateMany({
        where: { contractId },
        data: { remaining: 0 },
      });

      return tx.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.CANCELLED,
          hasAccessLibre: false,
        },
        include: this.contractInclude(),
      });
    });

    const detail = this.toDetail(contract);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.contractCancel,
      entityType: 'contract',
      entityId: contractId,
      before: beforeSnapshot,
      after: {
        memberId: detail.memberId,
        packId: detail.packId,
        status: detail.status,
        startsAt: detail.startsAt.toISOString(),
        endsAt: detail.endsAt?.toISOString() ?? null,
        hasAccessLibre: detail.hasAccessLibre,
        paymentId: detail.payment.id,
        creditBalances: detail.creditBalances.map((b) => ({
          serviceId: b.serviceId,
          remaining: b.remaining,
        })),
        reason,
      },
    });
    return detail;
  }

  /**
   * Crea pago APPROVED + contrato ACTIVE con saldos (idempotente por key).
   */
  async createForMember(
    tenantId: string,
    memberId: string,
    dto: CreateContractDto,
    actor: AuditActor,
  ): Promise<ContractDetail> {
    await this.assertMemberInTenant(tenantId, memberId, true);

    const pack = await this.loadActivePackForContract(tenantId, dto.packId);

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `stub-${randomBytes(16).toString('hex')}`;
    const method = dto.method ?? PaymentMethod.STUB;
    if (method === PaymentMethod.MP) {
      throw new BadRequestException(
        'Use POST /me/payments/mp/checkout for Mercado Pago pack purchases',
      );
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { include: this.contractInclude() },
      },
    });
    if (existingPayment?.contract) {
      return this.toDetail(existingPayment.contract);
    }
    if (existingPayment && !existingPayment.contract) {
      throw new BadRequestException(
        'Idempotency key already used without a contract',
      );
    }

    const plan = this.buildContractPlan(pack);

    try {
      const contract = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            tenantId,
            memberId,
            packId: pack.id,
            amount: pack.price,
            status: PaymentStatus.APPROVED,
            method,
            idempotencyKey,
          },
        });

        await this.cashRegister.recordIncomeIfCash(tx, {
          tenantId,
          paymentId: payment.id,
          memberId,
          amount: payment.amount,
          method: payment.method,
          concept: CashMovementConcept.PACK_CONTRACT,
          recordedByStaffId:
            actor.profileType === 'STAFF' ? actor.userId : null,
        });

        await this.receipts.issueForApprovedPayment(tx, {
          tenantId,
          paymentId: payment.id,
          memberId,
          amount: payment.amount,
          method: payment.method,
          concept: ReceiptConcept.PACK_CONTRACT,
          description: pack.name,
        });

        return this.createContractInTx(tx, {
          tenantId,
          memberId,
          packId: pack.id,
          paymentId: payment.id,
          plan,
          creditsExpireAt: pack.creditsExpireAt,
        });
      });

      const detail = this.toDetail(contract);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.contractCreate,
        entityType: 'contract',
        entityId: contract.id,
        before: null,
        after: this.auditSnapshot(detail),
      });
      return detail;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.payment.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: {
            contract: { include: this.contractInclude() },
          },
        });
        if (again?.contract) {
          return this.toDetail(again.contract);
        }
      }
      throw error;
    }
  }

  /**
   * Confirma contratación + comprobante para un pago MP ya APPROVED.
   *
   * @remarks Idempotente si el contrato ya existe. Usado por webhook (CU-PAG-001).
   */
  async confirmFromApprovedPayment(
    tenantId: string,
    paymentId: string,
    actor: AuditActor,
  ): Promise<ContractDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        contract: { include: this.contractInclude() },
        pack: {
          include: {
            components: { include: { service: true } },
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found in tenant`);
    }
    if (payment.contract) {
      return this.toDetail(payment.contract);
    }
    if (payment.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException(
        `Payment must be APPROVED to confirm contract (current: ${payment.status})`,
      );
    }
    if (payment.method !== PaymentMethod.MP) {
      throw new BadRequestException(
        'confirmFromApprovedPayment is only for MP payments',
      );
    }
    if (!payment.packId || !payment.pack) {
      throw new BadRequestException('MP pack payment is missing packId');
    }
    if (payment.sessionId) {
      throw new BadRequestException(
        'Payment looks like a drop-in checkout, not pack',
      );
    }

    const pack = payment.pack;
    if (pack.components.length === 0) {
      throw new BadRequestException('Pack has no components');
    }
    const plan = this.buildContractPlan(pack);

    try {
      const contract = await this.prisma.$transaction(async (tx) => {
        await this.receipts.issueForApprovedPayment(tx, {
          tenantId,
          paymentId: payment.id,
          memberId: payment.memberId,
          amount: payment.amount,
          method: payment.method,
          concept: ReceiptConcept.PACK_CONTRACT,
          description: pack.name,
        });

        return this.createContractInTx(tx, {
          tenantId,
          memberId: payment.memberId,
          packId: pack.id,
          paymentId: payment.id,
          plan,
          creditsExpireAt: pack.creditsExpireAt,
        });
      });

      const detail = this.toDetail(contract);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.contractCreate,
        entityType: 'contract',
        entityId: contract.id,
        before: null,
        after: this.auditSnapshot(detail),
      });
      return detail;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.payment.findFirst({
          where: { id: paymentId, tenantId },
          include: {
            contract: { include: this.contractInclude() },
          },
        });
        if (again?.contract) {
          return this.toDetail(again.contract);
        }
      }
      throw error;
    }
  }

  private async loadActivePackForContract(
    tenantId: string,
    packId: string,
  ): Promise<PackForContract> {
    const pack = await this.prisma.pack.findFirst({
      where: { id: packId, tenantId },
      include: {
        components: { include: { service: true } },
      },
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${packId} not found in tenant`);
    }
    if (!pack.active) {
      throw new BadRequestException('Pack is inactive');
    }
    if (pack.components.length === 0) {
      throw new BadRequestException('Pack has no components');
    }
    return pack;
  }

  private buildContractPlan(pack: PackForContract): ContractPlan {
    const startsAt = new Date();
    const endsAt = this.computeEndsAt(
      startsAt,
      pack.billingPeriod,
      pack.creditsExpireAt,
    );
    const hasAccessLibre = pack.components.some(
      (c) => c.service.type === ServiceType.ACCESO_LIBRE,
    );
    const creditComponents = pack.components.filter(
      (c) => c.service.type === ServiceType.POR_SESIONES,
    );

    for (const component of creditComponents) {
      if (!component.creditAmount || component.creditAmount < 1) {
        throw new BadRequestException(
          `Pack component for service ${component.serviceId} has invalid creditAmount`,
        );
      }
      if (!component.service.active) {
        throw new BadRequestException(
          `Service ${component.service.name} is inactive`,
        );
      }
    }

    return {
      startsAt,
      endsAt,
      hasAccessLibre,
      creditComponents: creditComponents.map((c) => ({
        serviceId: c.serviceId,
        creditAmount: c.creditAmount!,
      })),
    };
  }

  private createContractInTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      memberId: string;
      packId: string;
      paymentId: string;
      plan: ContractPlan;
      creditsExpireAt: Date | null;
    },
  ) {
    return tx.contract.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        packId: input.packId,
        paymentId: input.paymentId,
        status: ContractStatus.ACTIVE,
        startsAt: input.plan.startsAt,
        endsAt: input.plan.endsAt,
        hasAccessLibre: input.plan.hasAccessLibre,
        balances: {
          create: input.plan.creditComponents.map((c) => ({
            serviceId: c.serviceId,
            initialAmount: c.creditAmount,
            remaining: c.creditAmount,
            expiresAt: input.creditsExpireAt,
          })),
        },
      },
      include: this.contractInclude(),
    });
  }

  private computeEndsAt(
    startsAt: Date,
    billingPeriod: BillingPeriod,
    creditsExpireAt: Date | null,
  ): Date | null {
    if (billingPeriod === BillingPeriod.MONTHLY) {
      const ends = new Date(startsAt);
      ends.setMonth(ends.getMonth() + 1);
      return ends;
    }
    return creditsExpireAt;
  }

  private contractInclude() {
    return {
      pack: { select: { id: true, name: true } },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          idempotencyKey: true,
        },
      },
      balances: {
        include: {
          service: { select: { id: true, name: true } },
        },
        orderBy: { service: { name: 'asc' as const } },
      },
    };
  }

  private async assertMemberInTenant(
    tenantId: string,
    memberId: string,
    requireActive = false,
  ): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    if (requireActive && member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE to contract');
    }
  }

  private async findInTenant(
    tenantId: string,
    contractId: string,
  ): Promise<ContractWithRelations> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      include: this.contractInclude(),
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found in tenant`);
    }
    return contract;
  }

  private toDetail(contract: ContractWithRelations): ContractDetail {
    return {
      id: contract.id,
      tenantId: contract.tenantId,
      memberId: contract.memberId,
      packId: contract.packId,
      packName: contract.pack.name,
      status: contract.status,
      startsAt: contract.startsAt,
      endsAt: contract.endsAt,
      hasAccessLibre: contract.hasAccessLibre,
      payment: {
        id: contract.payment.id,
        amount: contract.payment.amount,
        status: contract.payment.status,
        method: contract.payment.method,
        idempotencyKey: contract.payment.idempotencyKey,
      },
      creditBalances: contract.balances.map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        serviceName: b.service.name,
        initialAmount: b.initialAmount,
        remaining: b.remaining,
        expiresAt: b.expiresAt,
      })),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  private auditSnapshot(detail: ContractDetail): Prisma.InputJsonValue {
    return {
      memberId: detail.memberId,
      packId: detail.packId,
      status: detail.status,
      startsAt: detail.startsAt.toISOString(),
      endsAt: detail.endsAt?.toISOString() ?? null,
      hasAccessLibre: detail.hasAccessLibre,
      paymentId: detail.payment.id,
      creditBalances: detail.creditBalances.map((b) => ({
        serviceId: b.serviceId,
        remaining: b.remaining,
      })),
    };
  }
}
