import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Transaction,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { tenantWebOrigin } from '../common/web-urls';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { PacksService } from '../packs/packs.service';
import { SessionValidationService } from '../sessions/session-validation.service';
import {
  CreateMpCartCheckoutDto,
  MpCartItemDto,
} from './dto/create-mp-cart-checkout.dto';
import { TransactionService } from './transaction.service';
import {
  MpCartLine,
  MpCartCheckoutResult,
  MpSignupPreference,
} from './payment.types';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { mpCopyForDropIn, mpCopyForPack } from './mp-item-copy';
import { applyDiscount, percentToBps } from './cash-discount';
import { reserveProductSale } from '../products/product-sales';
import { createMpProductLine } from './mp-product-line';

@Injectable()
export class OnlinePaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly transactionService: TransactionService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
    private readonly sessionValidation: SessionValidationService,
    private readonly packs: PacksService,
  ) {}

  async startCartCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpCartCheckoutDto,
    recordedByStaffId: string | null,
  ): Promise<MpCartCheckoutResult> {
    if (dto.applyTrial) {
      throw new BadRequestException(
        'Platform trial with Mercado Pago is not available yet. Use cash trial in Caja.',
      );
    }
    await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-cart-${randomBytes(16).toString('hex')}`;
    const existing = await this.prisma.transaction.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing && existing.memberId !== memberId) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }
    if (existing && recordedByStaffId && !existing.recordedByStaffId) {
      await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { recordedByStaffId },
      });
      existing.recordedByStaffId = recordedByStaffId;
    }
    if (
      existing &&
      (this.isTerminal(existing.status) || existing.mpPreferenceId)
    ) {
      return this.toCartResult(existing, existing.transactionItems);
    }

    const [discountDefaults] = await this.prisma.$queryRaw<
      Array<{ mpLinkBps: number }>
    >`
      SELECT "mp_link_discount_bps" AS "mpLinkBps"
      FROM "tenant_settings"
      WHERE "tenant_id" = ${tenantId}::uuid
    `;
    const discountBps = recordedByStaffId
      ? percentToBps(
          dto.discountPercent ?? (discountDefaults?.mpLinkBps ?? 0) / 100,
        )
      : 0;
    const resolvedLines = await this.resolveCartLines(
      tenantId,
      dto.items,
      memberId,
    );
    const lines = resolvedLines.map((line) => {
      const amount = applyDiscount(line.amount, discountBps);
      return {
        ...line,
        amount,
        listAmount: amount === line.amount ? undefined : line.amount,
        discountBps: amount === line.amount ? 0 : discountBps,
      };
    });
    const total = lines.reduce(
      (sum, line) => sum + line.amount * line.quantity,
      0,
    );
    if (existing) {
      const expectedItems = lines
        .flatMap((line) =>
          Array.from(
            { length: line.quantity },
            () =>
              `${line.kind}:${line.refId}:${line.amount}:${line.listAmount ?? ''}:${line.discountBps ?? 0}`,
          ),
        )
        .sort();
      const productSales = await this.prisma.$queryRaw<
        Array<{ transactionItemId: string; productId: string }>
      >`
        SELECT s.transaction_item_id AS "transactionItemId",
               s.product_id AS "productId"
        FROM product_sale_items s
        JOIN transaction_items i ON i.id = s.transaction_item_id
        WHERE i.transaction_id = ${existing.id}::uuid
          AND s.tenant_id = ${tenantId}::uuid
      `;
      const productByItem = new Map(
        productSales.map((sale) => [sale.transactionItemId, sale.productId]),
      );
      const savedItems = existing.transactionItems
        .map((item) => {
          const productId = productByItem.get(item.id);
          const kind = item.sessionId ? 'DROP_IN' : productId ? 'PRODUCT' : 'PACK';
          const refId = item.sessionId ?? productId ?? item.packId;
          return `${kind}:${refId}:${item.amount}:${item.listAmount ?? ''}:${item.discountBps}`;
        })
        .sort();
      if (
        existing.amount !== total ||
        JSON.stringify(savedItems) !== JSON.stringify(expectedItems)
      ) {
        throw new BadRequestException(
          'Idempotency key already used for a different checkout',
        );
      }
    }

    let cart: Transaction | null = existing;
    const transactionItems: {
      id: string;
      sessionId: string | null;
      packId: string | null;
      amount: number;
    }[] = existing?.transactionItems ?? [];
    if (!cart) {
      const created = await this.prisma.$transaction(async (tx) => {
        const createdCart = await tx.transaction.create({
          data: {
            tenantId,
            memberId,
            amount: total,
            status: PaymentStatus.PENDING,
            idempotencyKey,
            recordedByStaffId,
          },
        });
        const createdItems = [];
        let itemIndex = 0;
        for (const line of lines) {
          for (let n = 0; n < line.quantity; n++) {
            const transactionItem = await tx.transactionItem.create({
              data: {
                tenantId,
                memberId,
                packId:
                  line.kind === 'PACK' ? line.refId : (line.packId ?? null),
                sessionId: line.kind === 'DROP_IN' ? line.refId : null,
                amount: line.amount,
                listAmount: line.listAmount,
                discountBps: line.discountBps ?? 0,
                status: PaymentStatus.PENDING,
                method: PaymentMethod.MP,
                idempotencyKey: `${idempotencyKey}:${itemIndex++}`,
                transactionId: createdCart.id,
              },
            });
            createdItems.push(transactionItem);
            if (line.kind === 'PRODUCT') {
              await reserveProductSale(
                tx,
                {
                  tenantId,
                  transactionItemId: transactionItem.id,
                  productId: line.refId,
                  quantity: 1,
                  staffUserId: recordedByStaffId,
                },
                true,
              );
            }
          }
        }
        return { cart: createdCart, items: createdItems };
n      });
      cart = created.cart;
      transactionItems.push(...created.items);
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const notificationUrl = this.buildNotificationUrl(tenantId);
    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
    });
    try {
      const preference = await this.mp.createPreference({
        accessToken,
        items: lines.map((line) => ({
          title: line.title ?? '',
          description: line.description,
          quantity: line.quantity,
          unit_price: line.amount,
        })),
        externalReference: cart.id,
        notificationUrl,
        payerEmail: member.email,
        backUrl: dto.returnToWeb
          ? await this.memberWebBackUrl(tenantId, `compra=${cart.id}`)
          : undefined,
      });
      const updated = await this.prisma.transaction.update({
        where: { id: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });
      await this.prisma.transactionItem.updateMany({
        where: { transactionId: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });
      return this.toCartResult(updated, transactionItems);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.transaction.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
          include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
        });
        if (again) {
          return this.toCartResult(again, again.transactionItems);
        }
      }
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async createSignupPreference(input: {
    tenantId: string;
    packId: string;
    signupId: string;
    payerEmail: string;
  }): Promise<MpSignupPreference> {
    await this.requireMpConnected(input.tenantId);
    const item: MpCartItemDto = { kind: 'PACK', id: input.packId };
    const [line] = await this.resolveCartLines(input.tenantId, [item]);
    const accessToken = await this.accounts.getDecryptedAccessToken(
      input.tenantId,
    );
    try {
      const preference = await this.mp.createPreference({
        accessToken,
        items: [
          {
            title: line.title ?? '',
            description: line.description,
            quantity: 1,
            unit_price: line.amount,
          },
        ],
        externalReference: input.signupId,
        notificationUrl: this.buildNotificationUrl(input.tenantId),
        payerEmail: input.payerEmail,
        backUrl: await this.memberWebBackUrl(
          input.tenantId,
          `alta=${input.signupId}`,
        ),
      });
      return {
        amount: line.amount,
        preferenceId: preference.preferenceId,
        checkoutUrl: preference.initPoint,
        sandboxCheckoutUrl: preference.sandboxInitPoint,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async startTenantCartCheckout(
    catalogTenantId: string,
    billingTenantId: string,
    dto: CreateMpCartCheckoutDto,
    recordedByStaffId: string | null,
  ): Promise<MpCartCheckoutResult> {
    if (dto.applyTrial) {
      throw new BadRequestException(
        'Platform trial with Mercado Pago is not available yet. Use cash trial in Caja.',
      );
    }
    await this.requireMpConnected(catalogTenantId);
    if (dto.items.length === 0) {
      throw new BadRequestException('Cart must have at least one item');
    }
    if (dto.items.some((i) => i.kind !== 'PACK')) {
      throw new BadRequestException('Platform sales only support PACK items');
    }
    const target = await this.prisma.tenant.findUnique({
      where: { id: billingTenantId },
      select: { id: true, name: true, status: true },
    });
    if (!target) {
      throw new NotFoundException(`Tenant ${billingTenantId} not found`);
    }
    if (target.id === catalogTenantId) {
      throw new BadRequestException('A tenant cannot be billed for itself');
    }
    const payer = await this.prisma.staffUser.findFirst({
      where: { tenantId: billingTenantId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });
    if (!payer) {
      throw new BadRequestException(
        'Target tenant has no active staff to bill',
      );
    }
    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `tenant-mp-cart-${randomBytes(16).toString('hex')}`;
    const existing = await this.prisma.transaction.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: catalogTenantId,
          idempotencyKey,
        },
      },
      include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
    });
    if (
      existing &&
      (existing.memberId !== null ||
        existing.billedTenantId !== billingTenantId)
    ) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }
    if (existing && recordedByStaffId && !existing.recordedByStaffId) {
      await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { recordedByStaffId },
      });
      existing.recordedByStaffId = recordedByStaffId;
    }
    if (
      existing &&
      (this.isTerminal(existing.status) || existing.mpPreferenceId)
    ) {
      return this.toCartResult(existing, existing.transactionItems);
    }
    const lines = await this.resolveCartLines(catalogTenantId, dto.items);
    const total = lines.reduce(
      (sum, line) => sum + line.amount * line.quantity,
      0,
    );
    let cart: Transaction | null = existing;
    const transactionItems: {
      id: string;
      sessionId: string | null;
      packId: string | null;
      amount: number;
    }[] = existing?.transactionItems ?? [];
    if (!cart) {
      cart = await this.prisma.transaction.create({
        data: {
          tenantId: catalogTenantId,
          memberId: null,
          billedTenantId: billingTenantId,
          amount: total,
          status: PaymentStatus.PENDING,
          idempotencyKey,
          recordedByStaffId,
        },
      });
      let itemIndex = 0;
      for (const line of lines) {
        for (let n = 0; n < line.quantity; n++) {
          const transactionItem = await this.prisma.transactionItem.create({
            data: {
              tenantId: catalogTenantId,
              memberId: null,
              packId: line.kind === 'PACK' ? line.refId : null,
              sessionId: null,
              amount: line.amount,
              status: PaymentStatus.PENDING,
              method: PaymentMethod.MP,
              idempotencyKey: `${idempotencyKey}:${itemIndex++}`,
              transactionId: cart.id,
            },
          });
          transactionItems.push(transactionItem);
        }
      }
    }
    const accessToken =
      await this.accounts.getDecryptedAccessToken(catalogTenantId);
    const notificationUrl = this.buildNotificationUrl(catalogTenantId);
    try {
      const preference = await this.mp.createPreference({
        accessToken,
        items: lines.map((line) => ({
          title: line.title ?? '',
          description: line.description,
          quantity: line.quantity,
          unit_price: line.amount,
        })),
        externalReference: cart.id,
        notificationUrl,
        payerEmail: payer.email,
      });
      const updated = await this.prisma.transaction.update({
        where: { id: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });
      await this.prisma.transactionItem.updateMany({
        where: { transactionId: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });
      return this.toCartResult(updated, transactionItems);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.transaction.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: catalogTenantId,
              idempotencyKey,
            },
          },
          include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
        });
        if (again) {
          return this.toCartResult(again, again.transactionItems);
        }
      }
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async resolveCartLines(
    tenantId: string,
    items: CreateMpCartCheckoutDto['items'],
    memberId?: string,
  ): Promise<MpCartLine[]> {
    const lines: MpCartLine[] = [];
    for (const item of items) {
      const quantity = item.quantity ?? 1;
      if (item.kind === 'PACK') {
        const pack = await this.prisma.pack.findFirst({
          where: { id: item.id, tenantId, originServiceId: null },
          include: {
            components: {
              include: { service: { select: { name: true } } },
            },
          },
        });
        if (!pack) {
          throw new NotFoundException(`Pack ${item.id} not found in tenant`);
        }
        if (!pack.active) {
          throw new BadRequestException('Pack is inactive');
        }
        if (pack.components.length === 0) {
          throw new BadRequestException('Pack has no components');
        }
        if (pack.price < 1) {
          throw new BadRequestException('Pack price must be at least 1');
        }
        const packCopy = mpCopyForPack(
          pack.name,
          pack.components.map((c) => ({
            name: c.service.name,
            credits: c.creditAmount,
          })),
        );
        lines.push({
          kind: 'PACK',
          refId: pack.id,
          title: packCopy.title,
          description: packCopy.description,
          quantity,
          amount: pack.price,
          transactionItemIds: [],
        });
        continue;
      }
      if (item.kind === 'PRODUCT') {
        const [product] = await this.prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            description: string | null;
            price: number;
            active: boolean;
          }>
        >`
          SELECT id, name, description, price, active
          FROM products
          WHERE id = ${item.id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
        if (!product) throw new NotFoundException('Producto no encontrado.');
        lines.push(createMpProductLine(product, quantity));
        continue;
      }
      if (!memberId) {
        throw new BadRequestException('Drop-in checkout requires a member');
      }
      const session = await this.sessionValidation.validateSessionForDropIn(
        tenantId,
        memberId,
        item.id,
      );
      const dropInPack = await this.packs.ensureDropInPack(
        tenantId,
        session.serviceId,
        { requireEnabled: true },
      );
      if (!dropInPack) {
        throw new BadRequestException(
          'Drop-in is not enabled for this service (set dropInPrice)',
        );
      }
      const dropInCopy = mpCopyForDropIn({
        serviceName: session.service.name,
        branchName: session.branch.name,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      });
      lines.push({
        kind: 'DROP_IN',
        refId: session.id,
        packId: dropInPack.id,
        title: dropInCopy.title,
        description: dropInCopy.description,
        quantity,
        amount: dropInPack.price,
        transactionItemIds: [],
      });
    }
    return lines;
  }

  private isTerminal(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.APPROVED ||
      status === PaymentStatus.REJECTED ||
      status === PaymentStatus.REFUNDED
    );
  }

  private async toCartResult(
    cart: {
      id: string;
      tenantId: string;
      memberId: string | null;
      status: PaymentStatus;
      amount: number;
      idempotencyKey: string;
      mpPreferenceId: string | null;
      mpInitPoint?: string | null;
      mpSandboxInitPoint?: string | null;
    },
    transactionItems: {
      id: string;
      sessionId: string | null;
      packId: string | null;
      amount: number;
    }[],
  ): Promise<MpCartCheckoutResult> {
    const productSales = await this.prisma.$queryRaw<
      Array<{ transactionItemId: string; productId: string }>
    >`
      SELECT s.transaction_item_id AS "transactionItemId",
             s.product_id AS "productId"
      FROM product_sale_items s
      JOIN transaction_items i ON i.id = s.transaction_item_id
      WHERE i.transaction_id = ${cart.id}::uuid
        AND s.tenant_id = ${cart.tenantId}::uuid
    `;
    const productByItem = new Map(
      productSales.map((sale) => [sale.transactionItemId, sale.productId]),
    );
    const grouped = new Map<string, MpCartLine>();
    for (const item of transactionItems) {
      const productId = productByItem.get(item.id);
      const kind = item.sessionId ? 'DROP_IN' : productId ? 'PRODUCT' : 'PACK';
      const refId = item.sessionId ?? productId ?? item.packId ?? '';
      const key = `${kind}:${refId}:${item.amount}`;
      const line = grouped.get(key);
      if (line) {
        line.quantity += 1;
        line.transactionItemIds.push(item.id);
      } else {
        grouped.set(key, {
          kind,
          refId,
          quantity: 1,
          amount: item.amount,
          transactionItemIds: [item.id],
        });
      }
    }
    return {
      transactionId: cart.id,
      memberId: cart.memberId,
      status: cart.status,
      amount: cart.amount,
      idempotencyKey: cart.idempotencyKey,
      mpPreferenceId: cart.mpPreferenceId,
      checkoutUrl: cart.mpInitPoint ?? null,
      sandboxCheckoutUrl: cart.mpSandboxInitPoint ?? null,
      lines: [...grouped.values()],
    };
  }

  private buildNotificationUrl(tenantId: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    return `${publicBase}/api/webhooks/payment?tenantId=${tenantId}`;
  }

  private async memberWebBackUrl(
    tenantId: string,
    query: string,
  ): Promise<string> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { slug: true },
    });
    return `${tenantWebOrigin(this.config, tenant.slug)}/portal?${query}`;
  }

  private async requireActiveMember(
    tenantId: string,
    memberId: string,
  ): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member is not active');
    }
  }

  private async requireMpConnected(tenantId: string): Promise<void> {
    const account = await this.accounts.getStatus(tenantId);
    if (!account.connected) {
      throw new BadRequestException('Mercado Pago account is not connected');
    }
  }
}
