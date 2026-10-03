import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MemberSignupStatus, PaymentMethod } from '@prisma/client';
import { OnlinePaymentService } from '../payment/online-payment.service';
import { TransactionService } from '../payment/transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartMemberSignupDto } from './dto/member.dto';
import { MembersService } from './members.service';
import { MemberSignupCheckout, MemberSignupView } from './members.types';

/**
 * Alta web del socio con pago previo (CU-AFI-007, RN-CTA-007).
 *
 * @description La solicitud guarda los datos y el pack; el socio y el cart
 * nacen en el webhook del pago aprobado. Si no paga, no queda nada en
 * Afiliados. Mismo patrón que el alta del gym (`PlatformSignup`).
 */
@Injectable()
export class MemberSignupService {
  private readonly logger = new Logger(MemberSignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
    private readonly onlinePayment: OnlinePaymentService,
    private readonly transactions: TransactionService,
  ) {}

  /**
   * Valida, guarda (o reutiliza) la solicitud abierta y crea el checkout MP.
   */
  async start(
    identityId: string,
    dto: StartMemberSignupDto,
  ): Promise<MemberSignupCheckout> {
    const { tenantId, email } = await this.members.assertCanSelfJoin(
      identityId,
      dto.tenantSlug,
      dto.document,
    );
    const pack = await this.prisma.pack.findFirst({
      where: {
        id: dto.packId,
        tenantId,
        active: true,
        originServiceId: null,
      },
      select: { id: true, price: true },
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${dto.packId} not found in tenant`);
    }

    const data = {
      packId: pack.id,
      amount: pack.price,
      name: dto.name.trim(),
      document: dto.document.trim(),
      phone: dto.phone?.trim() || null,
      mpPreferenceId: null,
    };
    const open = await this.prisma.memberSignup.findFirst({
      where: { tenantId, identityId, status: MemberSignupStatus.PENDING },
      select: { id: true },
    });
    const signup = open
      ? await this.prisma.memberSignup.update({ where: { id: open.id }, data })
      : await this.prisma.memberSignup.create({
          data: { tenantId, identityId, ...data },
        });

    const preference = await this.onlinePayment.createSignupPreference({
      tenantId,
      packId: pack.id,
      signupId: signup.id,
      payerEmail: email,
    });
    await this.prisma.memberSignup.update({
      where: { id: signup.id },
      data: {
        amount: preference.amount,
        mpPreferenceId: preference.preferenceId,
      },
    });
    return {
      signupId: signup.id,
      checkoutUrl: preference.checkoutUrl,
      sandboxCheckoutUrl: preference.sandboxCheckoutUrl,
    };
  }

  /**
   * Estado de la solicitud (dueño de la cuenta).
   */
  async getMine(
    identityId: string,
    signupId: string,
  ): Promise<MemberSignupView> {
    const row = await this.prisma.memberSignup.findFirst({
      where: { id: signupId, identityId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!row) {
      throw new NotFoundException(`Signup ${signupId} not found`);
    }
    return row;
  }

  /**
   * Webhook: pago aprobado de un alta → crea el socio y el cart del pack.
   *
   * @returns Id del cart a confirmar, o null si el socio no se pudo crear
   * (queda FAILED con `lastError`; el pago sigue aprobado y lo resuelve el gym).
   * @remarks Idempotente ante reintentos del webhook.
   */
  async fulfillPaid(
    tenantId: string,
    signupId: string,
  ): Promise<string | null> {
    const signup = await this.prisma.memberSignup.findFirstOrThrow({
      where: { id: signupId, tenantId },
    });
    if (
      signup.status === MemberSignupStatus.COMPLETED &&
      signup.transactionId
    ) {
      return signup.transactionId;
    }
    if (signup.status === MemberSignupStatus.FAILED) {
      return null;
    }

    let memberId: string;
    try {
      memberId = await this.members.createFromPaidSignup({
        tenantId,
        identityId: signup.identityId,
        name: signup.name,
        document: signup.document,
        phone: signup.phone,
      });
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        this.logger.warn(
          `Member signup ${signup.id} paid but not fulfilled: ${error.message}`,
        );
        await this.prisma.memberSignup.update({
          where: { id: signup.id },
          data: {
            status: MemberSignupStatus.FAILED,
            lastError: error.message,
          },
        });
        return null;
      }
      throw error;
    }

    const idempotencyKey = `member-signup:${signup.id}`;
    const cart =
      (await this.prisma.transaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        select: { id: true },
      })) ??
      (await this.transactions.initiateTransaction({
        tenantId,
        memberId,
        method: PaymentMethod.MP,
        items: [
          { packId: signup.packId, amount: signup.amount, idempotencyKey },
        ],
        mpPreferenceId: signup.mpPreferenceId,
      }));

    await this.prisma.memberSignup.update({
      where: { id: signup.id },
      data: {
        status: MemberSignupStatus.COMPLETED,
        memberId,
        transactionId: cart.id,
        lastError: null,
      },
    });
    return cart.id;
  }
}
