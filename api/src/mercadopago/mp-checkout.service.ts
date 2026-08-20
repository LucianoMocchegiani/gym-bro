import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CartCheckout,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { CreateMpCheckoutDto } from './dto/create-mp-checkout.dto';
import { CreateMpDropInCheckoutDto } from './dto/create-mp-drop-in-checkout.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import {
  MpCartCheckoutResult,
  MpCartLine,
  MpCheckoutResult,
} from './mp-checkout.types';

/**
 * Checkout Mercado Pago: pack y drop-in (CU-PAG-001 / CU-RES-001 / RN-PAG-004).
 *
 * @remarks Crea Payment PENDING + Preference. Derechos al webhook APPROVED.
 */
@Injectable()
export class MpCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Inicia o reutiliza checkout de pack para el afiliado.
   */
  async startPackCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpCheckoutDto,
  ): Promise<MpCheckoutResult> {
    const member = await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const pack = await this.prisma.pack.findFirst({
      where: { id: dto.packId, tenantId },
      include: { components: true },
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${dto.packId} not found in tenant`);
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

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `mp-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    if (existing) {
      this.assertSameMpCheckout(existing, {
        memberId,
        packId: pack.id,
        sessionId: null,
      });
      if (this.isTerminalOrHasPreference(existing)) {
        return this.toResult(existing);
      }
    }

    return this.createPreferencePayment({
      tenantId,
      memberId,
      memberEmail: member.email,
      idempotencyKey,
      existing,
      amount: pack.price,
      title: pack.name,
      packId: pack.id,
      sessionId: null,
    });
  }

  /**
   * Inicia o reutiliza checkout drop-in para una sesión.
   *
   * @remarks No reserva cupo hasta APPROVED (webhook).
   */
  async startDropInCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpDropInCheckoutDto,
  ): Promise<MpCheckoutResult> {
    const member = await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, tenantId },
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
      throw new NotFoundException(
        `Session ${dto.sessionId} not found in tenant`,
      );
    }
    if (session.status !== SessionStatus.PUBLISHED) {
      throw new BadRequestException('Session is not published');
    }
    if (!session.service.active) {
      throw new BadRequestException('Service is inactive');
    }
    if (
      session.service.dropInPrice === null ||
      session.service.dropInPrice < 1
    ) {
      throw new BadRequestException(
        'Drop-in is not enabled for this service (set dropInPrice)',
      );
    }
    await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);
    if (session.bookedCount >= session.capacity) {
      throw new BadRequestException('Session is full');
    }

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-dropin-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    if (existing) {
      this.assertSameMpCheckout(existing, {
        memberId,
        packId: null,
        sessionId: session.id,
      });
      if (this.isTerminalOrHasPreference(existing)) {
        return this.toResult(existing);
      }
    }

    return this.createPreferencePayment({
      tenantId,
      memberId,
      memberEmail: member.email,
      idempotencyKey,
      existing,
      amount: session.service.dropInPrice,
      title: `Drop-in: ${session.service.name}`,
      packId: null,
      sessionId: session.id,
    });
  }

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
    const member = await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-cart-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.cartCheckout.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
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
      return this.toCartResult(existing, existing.payments);
    }

    const lines = await this.resolveCartLines(tenantId, dto.items);
    const total = lines.reduce(
      (sum, line) => sum + line.amount * line.quantity,
      0,
    );

    let cart: CartCheckout | null = existing;
    const payments: {
      id: string;
      sessionId: string | null;
      packId: string | null;
      amount: number;
    }[] = existing?.payments ?? [];

    if (!cart) {
      const cartId = randomUUID();
      cart = await this.prisma.cartCheckout.create({
        data: {
          id: cartId,
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
          const payment = await this.prisma.payment.create({
            data: {
              tenantId,
              memberId,
              packId: line.kind === 'PACK' ? line.refId : null,
              sessionId: line.kind === 'DROP_IN' ? line.refId : null,
              amount: line.amount,
              status: PaymentStatus.PENDING,
              method: PaymentMethod.MP,
              idempotencyKey: `${idempotencyKey}:${itemIndex++}`,
              cartId: cart.id,
            },
          });
          payments.push(payment);
        }
      }
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const notificationUrl = this.buildNotificationUrl(tenantId);

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

      const updated = await this.prisma.cartCheckout.update({
        where: { id: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });
      await this.prisma.payment.updateMany({
        where: { cartId: cart.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });

      return this.toCartResult(updated, payments);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.cartCheckout.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: {
            payments: { orderBy: { createdAt: 'asc' } },
          },
        });
        if (again) {
          return this.toCartResult(again, again.payments);
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
          paymentIds: [],
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
      if (session.status !== SessionStatus.PUBLISHED) {
        throw new BadRequestException('Session is not published');
      }
      if (!session.service.active) {
        throw new BadRequestException('Service is inactive');
      }
      if (
        session.service.dropInPrice === null ||
        session.service.dropInPrice < 1
      ) {
        throw new BadRequestException(
          'Drop-in is not enabled for this service (set dropInPrice)',
        );
      }
      await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);
      if (session.bookedCount >= session.capacity) {
        throw new BadRequestException('Session is full');
      }
      lines.push({
        kind: 'DROP_IN',
        refId: session.id,
        title: `Drop-in: ${session.service.name}`,
        quantity,
        amount: session.service.dropInPrice,
        paymentIds: [],
      });
    }
    return lines;
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
    payments: {
      id: string;
      sessionId: string | null;
      packId: string | null;
      amount: number;
    }[],
  ): MpCartCheckoutResult {
    const grouped = new Map<string, MpCartLine>();
    for (const payment of payments) {
      const kind = payment.sessionId ? 'DROP_IN' : 'PACK';
      const refId = payment.sessionId ?? payment.packId ?? '';
      const key = `${kind}:${refId}:${payment.amount}`;
      const line = grouped.get(key);
      if (line) {
        line.quantity += 1;
        line.paymentIds.push(payment.id);
      } else {
        grouped.set(key, {
          kind,
          refId,
          quantity: 1,
          amount: payment.amount,
          paymentIds: [payment.id],
        });
      }
    }
    return {
      cartId: cart.id,
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

  private async requireActiveMember(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true, email: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE to checkout');
    }
    return member;
  }

  private async requireMpConnected(tenantId: string): Promise<void> {
    const account = await this.accounts.getStatus(tenantId);
    if (!account.connected) {
      throw new BadRequestException('Mercado Pago account is not connected');
    }
  }

  private assertSameMpCheckout(
    existing: {
      method: PaymentMethod;
      memberId: string;
      packId: string | null;
      sessionId: string | null;
    },
    expected: {
      memberId: string;
      packId: string | null;
      sessionId: string | null;
    },
  ): void {
    if (existing.method !== PaymentMethod.MP) {
      throw new BadRequestException(
        'Idempotency key already used for a non-MP payment',
      );
    }
    if (
      existing.memberId !== expected.memberId ||
      existing.packId !== expected.packId ||
      existing.sessionId !== expected.sessionId
    ) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }
  }

  private isTerminal(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.APPROVED ||
      status === PaymentStatus.REJECTED ||
      status === PaymentStatus.REFUNDED
    );
  }

  private isTerminalOrHasPreference(existing: {
    status: PaymentStatus;
    mpPreferenceId: string | null;
  }): boolean {
    if (this.isTerminal(existing.status)) {
      return true;
    }
    return Boolean(existing.mpPreferenceId);
  }

  private async createPreferencePayment(input: {
    tenantId: string;
    memberId: string;
    memberEmail: string;
    idempotencyKey: string;
    existing: {
      id: string;
      status: PaymentStatus;
      amount: number;
      packId: string | null;
      sessionId: string | null;
      idempotencyKey: string;
      mpPreferenceId: string | null;
      mpInitPoint: string | null;
      mpSandboxInitPoint: string | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    } | null;
    amount: number;
    title: string;
    packId: string | null;
    sessionId: string | null;
  }): Promise<MpCheckoutResult> {
    const accessToken = await this.accounts.getDecryptedAccessToken(
      input.tenantId,
    );
    const notificationUrl = this.buildNotificationUrl(input.tenantId);

    try {
      const payment =
        input.existing ??
        (await this.prisma.payment.create({
          data: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            packId: input.packId,
            sessionId: input.sessionId,
            amount: input.amount,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.MP,
            idempotencyKey: input.idempotencyKey,
          },
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        }));

      const preference = await this.mp.createPreference({
        accessToken,
        items: [
          {
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
          },
        ],
        externalReference: payment.id,
        notificationUrl,
        payerEmail: input.memberEmail,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
        include: {
          contract: { select: { id: true } },
          reservation: { select: { id: true } },
        },
      });

      return this.toResult(updated);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.payment.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: input.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        });
        if (again) {
          return this.toResult(again);
        }
      }
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toResult(payment: {
    id: string;
    status: PaymentStatus;
    amount: number;
    packId: string | null;
    sessionId: string | null;
    idempotencyKey: string;
    mpPreferenceId: string | null;
    mpInitPoint?: string | null;
    mpSandboxInitPoint?: string | null;
    contract?: { id: string } | null;
    reservation?: { id: string } | null;
  }): MpCheckoutResult {
    const kind = payment.sessionId ? 'DROP_IN' : 'PACK';
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      kind,
      packId: payment.packId,
      sessionId: payment.sessionId,
      idempotencyKey: payment.idempotencyKey,
      mpPreferenceId: payment.mpPreferenceId,
      checkoutUrl: payment.mpInitPoint ?? null,
      sandboxCheckoutUrl: payment.mpSandboxInitPoint ?? null,
      contractId: payment.contract?.id ?? null,
      reservationId: payment.reservation?.id ?? null,
    };
  }
}
