import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DebitMandateStatus,
  ReservationStatus,
  TenantStatus,
  WaitlistStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, type AuditActor } from '../audit/audit.types';
import type { AuthUser } from '../auth/auth.types';
import { DebitService } from '../debit/debit.service';
import { MAIL_PORT, type MailPort } from '../notifications/mail.port';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import {
  ACCOUNT_DELETION_CONFIRM_WORD,
  DELETED_IDENTITY_EMAIL_DOMAIN,
} from './account-deletion.constants';

type Membership = { id: string; tenantId: string };

/**
 * Baja de la cuenta Faciliter de una persona (RN-CTA-001 a RN-CTA-004, CU-CTA-001).
 *
 * @remarks La `Identity` no se borra: socios y staff de cada gym la referencian
 * y el gym conserva su ficha e historial. Se anonimiza (mail inválido, sin
 * nombre, contraseña ni Google/Apple), así nadie vuelve a entrar con ella; el
 * mismo mail o Google después crea una cuenta nueva y vacía.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly debit: DebitService,
    private readonly reservations: ReservationsService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  /**
   * Elimina la cuenta de la persona detrás del JWT (identity, staff o socio).
   *
   * @remarks Efectos, en orden:
   * 1. sale de las listas de espera, cancela débitos automáticos y reservas
   *    futuras en todos sus gyms (el pack vigente se pierde, RN-CTA-002);
   * 2. desactiva sus usuarios staff, revoca todas las sesiones y borra sus
   *    avisos y preferencias;
   * 3. anonimiza la identity y audita `identity.delete` (global y por gym);
   * 4. manda un mail de confirmación al mail original (best-effort).
   * @throws {BadRequestException} `confirm` distinto de `ELIMINAR`.
   * @throws {ForbiddenException} Sesión impersonada.
   * @throws {ConflictException} Es dueña de un gym activo (RN-CTA-003).
   * @throws {UnauthorizedException} La persona ya no existe o ya fue eliminada.
   */
  async deleteAccount(user: AuthUser, confirm: string): Promise<{ ok: true }> {
    if (confirm !== ACCOUNT_DELETION_CONFIRM_WORD) {
      throw new BadRequestException(
        `Escribí ${ACCOUNT_DELETION_CONFIRM_WORD} para confirmar`,
      );
    }
    if (user.impersonatedBy) {
      throw new ForbiddenException(
        'No se puede eliminar una cuenta desde una impersonación',
      );
    }
    const identity = await this.identityOf(user);
    await this.assertNotGymOwner(identity.id);

    const actor: AuditActor = { profileType: 'IDENTITY', userId: identity.id };
    const [members, staff] = await Promise.all([
      this.prisma.member.findMany({
        where: { identityId: identity.id },
        select: { id: true, tenantId: true },
      }),
      this.prisma.staffUser.findMany({
        where: { identityId: identity.id },
        select: { id: true, tenantId: true },
      }),
    ]);
    const memberIds = members.map((m) => m.id);

    await this.prisma.waitlistEntry.updateMany({
      where: { memberId: { in: memberIds }, status: WaitlistStatus.WAITING },
      data: { status: WaitlistStatus.LEFT },
    });
    const debitsCancelled = await this.cancelDebits(members, actor);
    const reservationsCancelled = await this.cancelFutureReservations(
      members,
      actor,
    );

    const tenantIds = [
      ...new Set([...members, ...staff].map((row) => row.tenantId)),
    ];
    const summary = {
      members: members.length,
      staff: staff.length,
      debitsCancelled,
      reservationsCancelled,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.updateMany({
        where: { identityId: identity.id },
        data: { active: false },
      });
      await tx.refreshToken.updateMany({
        where: {
          revokedAt: null,
          OR: [
            { identityId: identity.id },
            { staffUser: { identityId: identity.id } },
            { member: { identityId: identity.id } },
          ],
        },
        data: { revokedAt: new Date() },
      });
      await tx.notification.deleteMany({
        where: {
          OR: [{ identityId: identity.id }, { memberId: { in: memberIds } }],
        },
      });
      await tx.notificationPreference.deleteMany({
        where: { memberId: { in: memberIds } },
      });
      await tx.identity.update({
        where: { id: identity.id },
        data: {
          email: `deleted-${identity.id}@${DELETED_IDENTITY_EMAIL_DOMAIN}`,
          name: null,
          passwordHash: null,
          passwordTemporary: false,
          googleSub: null,
          appleSub: null,
        },
      });
      await this.audit.recordInTx(tx, {
        tenantId: null,
        actor,
        action: AUDIT_ACTIONS.identityDelete,
        entityType: 'Identity',
        entityId: identity.id,
        after: summary,
      });
      for (const tenantId of tenantIds) {
        await this.audit.recordInTx(tx, {
          tenantId,
          actor,
          action: AUDIT_ACTIONS.identityDelete,
          entityType: 'Identity',
          entityId: identity.id,
        });
      }
    });

    await this.sendGoodbye(identity.email);
    return { ok: true };
  }

  private async identityOf(user: AuthUser) {
    let identityId: string | null = null;
    if (user.profileType === 'IDENTITY') {
      identityId = user.userId;
    } else if (user.profileType === 'STAFF') {
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: user.userId },
        select: { identityId: true },
      });
      identityId = staff?.identityId ?? null;
    } else {
      const member = await this.prisma.member.findUnique({
        where: { id: user.userId },
        select: { identityId: true },
      });
      identityId = member?.identityId ?? null;
    }
    const identity = identityId
      ? await this.prisma.identity.findUnique({
          where: { id: identityId },
          select: { id: true, email: true },
        })
      : null;
    if (
      !identity ||
      identity.email.endsWith(`@${DELETED_IDENTITY_EMAIL_DOMAIN}`)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return identity;
  }

  private async assertNotGymOwner(identityId: string): Promise<void> {
    const owned = await this.prisma.tenant.findMany({
      where: { ownerIdentityId: identityId, status: TenantStatus.ACTIVE },
      select: { name: true },
    });
    if (owned.length > 0) {
      const names = owned.map((t) => t.name).join(', ');
      throw new ConflictException(
        `Sos dueño de ${names}. Primero da de baja o transferí el gym.`,
      );
    }
  }

  /** Débitos no cancelados de cada socio. Un fallo no frena la baja. */
  private async cancelDebits(
    members: Membership[],
    actor: AuditActor,
  ): Promise<number> {
    const mandates = await this.prisma.debitMandate.findMany({
      where: {
        memberId: { in: members.map((m) => m.id) },
        status: { not: DebitMandateStatus.CANCELLED },
      },
      select: { id: true, tenantId: true },
    });
    let cancelled = 0;
    for (const mandate of mandates) {
      try {
        await this.debit.cancel(mandate.tenantId, mandate.id, actor);
        cancelled++;
      } catch (err) {
        this.logger.warn(
          `cancel debit ${mandate.id} on account deletion: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return cancelled;
  }

  /** Reservas confirmadas que todavía no empezaron (libera cupo y waitlist). */
  private async cancelFutureReservations(
    members: Membership[],
    actor: AuditActor,
  ): Promise<number> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        memberId: { in: members.map((m) => m.id) },
        status: ReservationStatus.CONFIRMED,
        session: { startsAt: { gt: new Date() } },
      },
      select: { id: true, tenantId: true, memberId: true },
    });
    let cancelled = 0;
    for (const reservation of reservations) {
      try {
        await this.reservations.cancel(
          reservation.tenantId,
          reservation.id,
          { status: ReservationStatus.CANCELLED },
          actor,
          reservation.memberId,
        );
        cancelled++;
      } catch (err) {
        this.logger.warn(
          `cancel reservation ${reservation.id} on account deletion: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return cancelled;
  }

  private async sendGoodbye(email: string): Promise<void> {
    try {
      await this.mail.send({
        to: email,
        subject: 'Tu cuenta de Faciliter fue eliminada',
        text: [
          'Hola,',
          '',
          'Eliminamos tu cuenta de Faciliter. Ya no vas a poder entrar con este mail, Google ni Apple.',
          '',
          'Los gyms donde estabas conservan su registro de pagos y comprobantes. Si querés que un gym borre también tu ficha, pedíselo directamente.',
        ].join('\n'),
      });
    } catch (err) {
      this.logger.warn(
        `goodbye mail failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
