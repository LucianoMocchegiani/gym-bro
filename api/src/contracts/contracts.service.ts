import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  AccessAttemptResult,
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
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaOfferService } from '../kuatia/kuatia-offer.service';
import { CashPaymentService } from '../payment/cash-payment.service';
import { CreateContractDto, UpdateContractStatusDto } from './dto/contract.dto';
import { ContractDetail } from './contracts.types';

/** Whitelist de orden para {@link ContractsService.listByMember}. */
const CONTRACT_ORDER_FIELDS = ['createdAt', 'startsAt'] as const;

type ContractWithRelations = Contract & {
  pack: { id: string; name: string };
  transactionItem: {
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
  endsAt: Date;
  hasAccessLibre: boolean;
  creditComponents: { serviceId: string; creditAmount: number }[];
};

/**
 * Contrataciones tras pago aprobado y cancelación de derechos.
 *
 * @remarks CU-CON-001 / CU-CON-002 / RN-PAG-004 / RN-SER-009 / RN-CON-001–003.
 * Pago CASH registra movimiento de caja (RN-PAG-007). Comprobante interno
 * RN-PAG-009. MP confirma vía webhook con {@link confirmFromApprovedPayment}.
 * Vigencias: MONTHLY apila por pack (día siguiente a `endsAt` si renueva a
 * tiempo o usó tolerancia en puerta; si no, día de pago). ONE_TIME puede solapar.
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => CashPaymentService))
    private readonly cashPayment: CashPaymentService,
    private readonly kuatiaOffers: KuatiaOfferService,
  ) {}

  /**
   * Lista contrataciones de un afiliado del tenant (paginado, para HTTP).
   *
   * @remarks Sin filtros de vigencia/estado; para lecturas internas
   * (p. ej. estado de cuenta) usar {@link listAllByMember}.
   */
  async listByMember(
    tenantId: string,
    memberId: string,
    query: ListQueryDto = {},
  ): Promise<ListResult<ContractDetail>> {
    await this.assertMemberInTenant(tenantId, memberId);
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      CONTRACT_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.ContractWhereInput = { tenantId, memberId };
    const [contracts, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: this.contractInclude(),
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.contract.count({ where }),
    ]);
    return toListResult(
      contracts.map((c) => this.toDetail(c)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Lista completa (sin paginar) de contrataciones de un afiliado.
   *
   * @remarks Uso interno (p. ej. {@link MembersService.getAccount}), no HTTP.
   * @param options.coversAt - Solo contratos cuya vigencia incluye este instante
   *   (`startsAt <= coversAt` y `endsAt` null o `> coversAt`), filtrado en DB.
   * @param options.status - Filtro opcional de estado (p. ej. ACTIVE).
   */
  async listAllByMember(
    tenantId: string,
    memberId: string,
    options: { coversAt?: Date; status?: ContractStatus } = {},
  ): Promise<ContractDetail[]> {
    await this.assertMemberInTenant(tenantId, memberId);
    const coversAt = options.coversAt;
    const contracts = await this.prisma.contract.findMany({
      where: {
        tenantId,
        memberId,
        ...(options.status ? { status: options.status } : {}),
        ...(coversAt
          ? {
              startsAt: { lte: coversAt },
              OR: [{ endsAt: null }, { endsAt: { gt: coversAt } }],
            }
          : {}),
      },
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
        transactionItemId: detail.transactionItem.id,
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
    if (method === PaymentMethod.CASH) {
      throw new BadRequestException(
        'Use POST /members/:id/transaction-items/cash/cart for CASH pack purchases',
      );
    }

    const existingTransactionItem = await this.prisma.transactionItem.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { include: this.contractInclude() },
      },
    });
    if (existingTransactionItem?.contract) {
      // Misma key = idempotencia de pago/contrato + force re-oferta Quark.
      await this.kuatiaOffers.ensureOfferForContract(
        tenantId,
        existingTransactionItem.contract.id,
        { force: true },
      );
      return this.toDetail(existingTransactionItem.contract);
    }
    if (existingTransactionItem && !existingTransactionItem.contract) {
      throw new BadRequestException(
        'Idempotency key already used without a contract',
      );
    }

    const plan = await this.resolveContractPlan(tenantId, memberId, pack, {
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });

    try {
      const contract = await this.prisma.$transaction(async (tx) => {
        const { transaction } = await this.cashPayment.processPayment(tx, {
          tenantId,
          memberId,
          items: [{
            packId: pack.id,
            amount: pack.price,
            idempotencyKey,
          }],
          idempotencyKey,
          method,
          cashConcept: CashMovementConcept.PACK_CONTRACT,
          receiptConcept: ReceiptConcept.PACK_CONTRACT,
          description: pack.name,
          recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
        });

        return this.createContractInTx(tx, {
          tenantId,
          memberId,
          packId: pack.id,
          transactionItemId: transaction.transactionItems[0].id,
          plan,
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
      await this.kuatiaOffers.ensureOfferForContract(tenantId, contract.id);
      return detail;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.transactionItem.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: {
            contract: { include: this.contractInclude() },
          },
        });
        if (again?.contract) {
          await this.kuatiaOffers.ensureOfferForContract(
            tenantId,
            again.contract.id,
          );
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
    transactionItemId: string,
    actor: AuditActor,
  ): Promise<ContractDetail> {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      include: {
        contract: { include: this.contractInclude() },
        pack: {
          include: {
            components: { include: { service: true } },
          },
        },
      },
    });
    if (!transactionItem) {
      throw new NotFoundException(`TransactionItem ${transactionItemId} not found in tenant`);
    }
    if (transactionItem.contract) {
      await this.kuatiaOffers.ensureOfferForContract(
        tenantId,
        transactionItem.contract.id,
        { force: true },
      );
      return this.toDetail(transactionItem.contract);
    }
    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException(
        `TransactionItem must be APPROVED to confirm contract (current: ${transactionItem.status})`,
      );
    }
    if (transactionItem.method !== PaymentMethod.MP) {
      throw new BadRequestException(
        'confirmFromApprovedPayment is only for MP payments',
      );
    }
    if (!transactionItem.packId || !transactionItem.pack) {
      throw new BadRequestException('MP pack payment is missing packId');
    }
    if (transactionItem.sessionId) {
      throw new BadRequestException(
        'TransactionItem looks like a drop-in checkout, not pack',
      );
    }

    const pack = transactionItem.pack;
    if (pack.components.length === 0) {
      throw new BadRequestException('Pack has no components');
    }
    const plan = await this.resolveContractPlan(
      tenantId,
      transactionItem.memberId,
      pack,
    );

    try {
      const contract = await this.prisma.$transaction(async (tx) => {
        return this.createContractInTx(tx, {
          tenantId,
          memberId: transactionItem.memberId,
          packId: pack.id,
          transactionItemId: transactionItem.id,
          plan,
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
      await this.kuatiaOffers.ensureOfferForContract(tenantId, contract.id);
      return detail;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.transactionItem.findFirst({
          where: { id: transactionItemId, tenantId },
          include: {
            contract: { include: this.contractInclude() },
          },
        });
        if (again?.contract) {
          await this.kuatiaOffers.ensureOfferForContract(
            tenantId,
            again.contract.id,
          );
          return this.toDetail(again.contract);
        }
      }
      throw error;
    }
  }

  /**
   * Crea un contrato desde un TransactionItem ya APPROVED (CASH cart).
   *
   * @remarks No verifica método de pago — asume que el caller ya validó que
   * es APPROVED. Usado por CashPaymentService.startCashCart.
   */
  async createFromTransactionItem(
    tenantId: string,
    transactionItemId: string,
    actor: AuditActor,
  ): Promise<ContractDetail> {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      include: {
        pack: {
          include: {
            components: { include: { service: true } },
          },
        },
        contract: { include: this.contractInclude() },
      },
    });

    if (!transactionItem) {
      throw new NotFoundException(
        `TransactionItem ${transactionItemId} not found in tenant`,
      );
    }

    if (transactionItem.contract) {
      return this.toDetail(transactionItem.contract);
    }

    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException(
        `TransactionItem must be APPROVED (current: ${transactionItem.status})`,
      );
    }

    if (!transactionItem.packId || !transactionItem.pack) {
      throw new BadRequestException(
        'TransactionItem is not a pack payment',
      );
    }

    if (transactionItem.sessionId) {
      throw new BadRequestException(
        'TransactionItem looks like a drop-in, not pack',
      );
    }

    const pack = transactionItem.pack;
    if (pack.components.length === 0) {
      throw new BadRequestException('Pack has no components');
    }

    const plan = await this.resolveContractPlan(
      tenantId,
      transactionItem.memberId,
      pack,
    );

    const contract = await this.prisma.$transaction(async (tx) => {
      return this.createContractInTx(tx, {
        tenantId,
        memberId: transactionItem.memberId,
        packId: pack.id,
        transactionItemId: transactionItem.id,
        plan,
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
    await this.kuatiaOffers.ensureOfferForContract(tenantId, contract.id);
    return detail;
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

  /**
   * Calcula vigencia del contrato según billing del pack (RN-CON-001–004).
   *
   * @remarks MONTHLY: un solo plan por afiliado; sin override apila desde el
   * último contrato del mismo pack (incl. vencidos): día calendario siguiente
   * a `endsAt` si aún vigente o si hubo ingreso ALLOWED tras el vencimiento
   * (usó tolerancia); si el hueco no tuvo ingresos → `startsAt = now`.
   * Con `startsAt` manual → +1 mes y 400 si solapa el mismo pack.
   * ONE_TIME: puede solapar; defaults +1 mes / `creditsExpireAt`; override
   * `startsAt` y/o `endsAt`. Créditos heredan `endsAt`.
   * @throws {BadRequestException} Otro pack MONTHLY vigente, solape MONTHLY,
   *   `endsAt` en MONTHLY, o rango inválido.
   */
  private async resolveContractPlan(
    tenantId: string,
    memberId: string,
    pack: PackForContract,
    override?: { startsAt?: Date; endsAt?: Date },
  ): Promise<ContractPlan> {
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

    const hasAccessLibre = pack.components.some(
      (c) => c.service.type === ServiceType.ACCESO_LIBRE,
    );
    const mappedCredits = creditComponents.map((c) => ({
      serviceId: c.serviceId,
      creditAmount: c.creditAmount!,
    }));

    const now = new Date();
    const overrideStart = override?.startsAt;
    const overrideEnd = override?.endsAt;
    if (overrideStart && Number.isNaN(overrideStart.getTime())) {
      throw new BadRequestException('startsAt is invalid');
    }
    if (overrideEnd && Number.isNaN(overrideEnd.getTime())) {
      throw new BadRequestException('endsAt is invalid');
    }

    if (pack.billingPeriod === BillingPeriod.MONTHLY) {
      if (overrideEnd) {
        throw new BadRequestException(
          'endsAt is not allowed for MONTHLY packs (duration is always +1 month)',
        );
      }

      const monthlyLive = await this.prisma.contract.findMany({
        where: {
          AND: [
            { tenantId },
            { memberId },
            { status: ContractStatus.ACTIVE },
            { pack: { billingPeriod: BillingPeriod.MONTHLY } },
            {
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
          ],
        },
        include: {
          pack: { select: { id: true, name: true } },
        },
      });

      const otherPlan = monthlyLive.find((c) => c.packId !== pack.id);
      if (otherPlan) {
        throw new BadRequestException(
          `Member already has an active MONTHLY plan (${otherPlan.pack.name}). ` +
            'Renew that pack or use a ONE_TIME pack for extras.',
        );
      }

      let startsAt: Date;
      if (overrideStart) {
        startsAt = overrideStart;
        const endsAt = this.addOneMonth(startsAt);
        await this.assertNoMonthlyOverlap(
          tenantId,
          memberId,
          pack.id,
          startsAt,
          endsAt,
        );
        return {
          startsAt,
          endsAt,
          hasAccessLibre,
          creditComponents: mappedCredits,
        };
      }

      startsAt = await this.resolveMonthlyRenewalStartsAt(
        tenantId,
        memberId,
        pack.id,
        now,
      );

      const endsAt = this.addOneMonth(startsAt);
      return {
        startsAt,
        endsAt,
        hasAccessLibre,
        creditComponents: mappedCredits,
      };
    }

    if (overrideEnd && !overrideStart && overrideEnd <= now) {
      throw new BadRequestException('endsAt must be after startsAt (now)');
    }

    const startsAt = overrideStart ?? now;
    let endsAt: Date;
    if (overrideEnd) {
      endsAt = overrideEnd;
    } else {
      const customEnd = pack.creditsExpireAt;
      endsAt =
        customEnd && customEnd > startsAt
          ? customEnd
          : this.addOneMonth(startsAt);
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return {
      startsAt,
      endsAt,
      hasAccessLibre,
      creditComponents: mappedCredits,
    };
  }

  /**
   * Rechaza solape abierto con contratos ACTIVE del mismo pack MONTHLY.
   *
   * @remarks Tocarse en el borde (`startsAt === other.endsAt`) está permitido.
   */
  private async assertNoMonthlyOverlap(
    tenantId: string,
    memberId: string,
    packId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    const samePack = await this.prisma.contract.findMany({
      where: {
        tenantId,
        memberId,
        packId,
        status: ContractStatus.ACTIVE,
        endsAt: { not: null },
      },
      select: { id: true, startsAt: true, endsAt: true },
    });
    const clash = samePack.find((c) => {
      if (!c.endsAt) {
        return false;
      }
      return startsAt < c.endsAt && endsAt > c.startsAt;
    });
    if (clash) {
      throw new BadRequestException(
        `MONTHLY startsAt overlaps an active contract of the same pack ` +
          `(${clash.startsAt.toISOString()} → ${clash.endsAt!.toISOString()})`,
      );
    }
  }

  private createContractInTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      memberId: string;
      packId: string;
      transactionItemId: string;
      plan: ContractPlan;
    },
  ) {
    return tx.contract.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        packId: input.packId,
        transactionItemId: input.transactionItemId,
        status: ContractStatus.ACTIVE,
        startsAt: input.plan.startsAt,
        endsAt: input.plan.endsAt,
        hasAccessLibre: input.plan.hasAccessLibre,
        balances: {
          create: input.plan.creditComponents.map((c) => ({
            serviceId: c.serviceId,
            initialAmount: c.creditAmount,
            remaining: c.creditAmount,
            expiresAt: input.plan.endsAt,
          })),
        },
      },
      include: this.contractInclude(),
    });
  }

  /**
   * `startsAt` de renovación MONTHLY sin override.
   *
   * @remarks Encadena al día siguiente del `endsAt` previo si el pack sigue
   * vigente o si el afiliado ingresó (ALLOWED) después del vencimiento.
   * Si venció sin ingresos en el hueco → día de pago (`now`).
   */
  private async resolveMonthlyRenewalStartsAt(
    tenantId: string,
    memberId: string,
    packId: string,
    now: Date,
  ): Promise<Date> {
    const lastSamePack = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        memberId,
        packId,
        status: ContractStatus.ACTIVE,
        endsAt: { not: null },
      },
      orderBy: { endsAt: 'desc' },
      select: { endsAt: true },
    });
    if (!lastSamePack?.endsAt) {
      return now;
    }

    const prevEnd = lastSamePack.endsAt;
    if (prevEnd > now) {
      return this.dayAfter(prevEnd);
    }

    const usedTolerance = await this.prisma.accessAttempt.findFirst({
      where: {
        tenantId,
        memberId,
        result: AccessAttemptResult.ALLOWED,
        createdAt: { gt: prevEnd },
      },
      select: { id: true },
    });
    return usedTolerance ? this.dayAfter(prevEnd) : now;
  }

  /** Día calendario siguiente al instante dado (misma hora local). */
  private dayAfter(from: Date): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    return next;
  }

  /** Suma un mes calendario a [from] (misma heurística que antes). */
  private addOneMonth(from: Date): Date {
    const ends = new Date(from);
    ends.setMonth(ends.getMonth() + 1);
    return ends;
  }

  private contractInclude() {
    return {
      pack: { select: { id: true, name: true } },
      transactionItem: {
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
      transactionItem: {
        id: contract.transactionItem.id,
        amount: contract.transactionItem.amount,
        status: contract.transactionItem.status,
        method: contract.transactionItem.method,
        idempotencyKey: contract.transactionItem.idempotencyKey,
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
      transactionItemId: detail.transactionItem.id,
      creditBalances: detail.creditBalances.map((b) => ({
        serviceId: b.serviceId,
        remaining: b.remaining,
      })),
    };
  }
}
