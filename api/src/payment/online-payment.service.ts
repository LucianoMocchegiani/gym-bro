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
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { CreateMpCartCheckoutDto, MpCartItemDto } from './dto/create-mp-cart-checkout.dto';
import { TransactionService } from './transaction.service';
import {
  MpCartLine,
  MpCartCheckoutResult,
} from './payment.types';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';

/**
 * Checkout de pagos online (Mercado Pago).
 *
 * @description
 * Solo cart (Caja) — crea Transaction + TransactionItems PENDING + Preference MP.
 * Al webhook APPROVED se confirman los derechos (contratos/reservas).
 */
@Injectable()
export class OnlinePaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly transactionService: TransactionService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Inicia o reutiliza checkout de carrito MP (Caja): 1 preference con
   * items[] → 1 pago. Al webhook APPROVED se confirma cada pack/reserva.
   *
   * @remarks Modelo MercadoLibre: el carrito agrega ítems, pero el checkout
   * es un solo total y un solo pago (RN-PAG-009 / CU-PAG-001).
   */
  async startCartCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpCartCheckoutDto,
  ): Promise<MpCartCheckoutResult> {
    await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-cart-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.transaction.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        transactionItems: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (existing && existing.memberId !== memberId) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }

    if (
      existing &&
      (this.isTerminal(existing.status) || existing.mpPreferenceId)
    ) {
      return this.toCartResult(existing, existing.transactionItems);
    }

    const lines = await this.resolveCartLines(tenantId, dto.items);
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
          tenantId,
          memberId,
          amount: total,
          status: PaymentStatus.PENDING,
          idempotencyKey,
        },
      });

      let itemIndex = 0;
      for (const line of lines) {
        for (let n = 0; n < line.quantity; n++) {
          const transactionItem = await this.prisma.transactionItem.create({
            data: {
              tenantId,
              memberId,
              packId: line.kind === 'PACK' ? line.refId : null,
              sessionId: line.kind === 'DROP_IN' ? line.refId : null,
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
          quantity: line.quantity,
          unit_price: line.amount,
        })),
        externalReference: cart.id,
        notificationUrl,
        payerEmail: member.email,
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
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: {
            transactionItems: { orderBy: { createdAt: 'asc' } },
          },
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
  ): Promise<MpCartLine[]> {
    const lines: MpCartLine[] = [];
    for (const item of items) {
      const quantity = item.quantity ?? 1;
      if (item.kind === 'PACK') {
        const pack = await this.prisma.pack.findFirst({
          where: { id: item.id, tenantId },
          include: { components: true },
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
        lines.push({
          kind: 'PACK',
          refId: pack.id,
          title: pack.name,
          quantity,
          amount: pack.price,
          transactionItemIds: [],
        });
        continue;
      }

      const session = await this.prisma.session.findFirst({
        where: { id: item.id, tenantId },
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          bookedCount: true,
          service: {
            select: {
              name: true,
              active: true,
              dropInPrice: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException(`Session ${item.id} not found in tenant`);
      }
      if (session.status !== 'PUBLISHED') {
        throw new BadRequestException('Session is not published');
      }
      if (!session.service.active) {
        throw new BadRequestException('Service is inactive');
      }
      if (!session.service.dropInPrice) {
        throw new BadRequestException('Service has no drop-in price');
      }
      lines.push({
        kind: 'DROP_IN',
        refId: session.id,
        title: `Drop-in: ${session.service.name}`,
        quantity,
        amount: session.service.dropInPrice,
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

  private toCartResult(
    cart: {
      id: string;
      memberId: string;
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
  ): MpCartCheckoutResult {
    const grouped = new Map<string, MpCartLine>();
    for (const transactionItem of transactionItems) {
      const kind = transactionItem.sessionId ? 'DROP_IN' : 'PACK';
      const refId = transactionItem.sessionId ?? transactionItem.packId ?? '';
      const key = `${kind}:${refId}:${transactionItem.amount}`;
      const line = grouped.get(key);
      if (line) {
        line.quantity += 1;
        line.transactionItemIds.push(transactionItem.id);
      } else {
        grouped.set(key, {
          kind,
          refId,
          quantity: 1,
          amount: transactionItem.amount,
          transactionItemIds: [transactionItem.id],
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
    return `${publicBase}/api/webhooks/mercadopago?tenantId=${tenantId}`;
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
