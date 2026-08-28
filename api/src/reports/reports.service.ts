import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ContractStatus,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPaymentRow, ReportsSummary } from './reports.types';

const REPORTS_TIMEZONE = 'America/Argentina/Buenos_Aires' as const;
const DETAIL_LIMIT = 200;

/**
 * Reportes de dinero + snapshot comercial (E11).
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resumen de reportes para el tenant.
   *
   * @param tenantId Tenant del JWT staff.
   * @param fromYmd Inicio inclusive (YYYY-MM-DD BA); default 1º del mes.
   * @param toYmd Fin inclusive (YYYY-MM-DD BA); default hoy BA.
   * @param memberId Filtrar por afiliado específico (opcional).
   */
  async getSummary(
    tenantId: string,
    fromYmd?: string,
    toYmd?: string,
    memberId?: string,
  ): Promise<ReportsSummary> {
    const today = this.businessYmd(new Date());
    const from = fromYmd ?? `${today.slice(0, 7)}-01`;
    const to = toYmd ?? today;
    this.assertValidRange(from, to);

    const rangeStart = this.dayStartUtc(from);
    const rangeEndExclusive = this.dayStartUtc(this.addDaysYmd(to, 1));

    const [
      activeMembers,
      suspendedMembers,
      inactiveMembers,
      activeWithoutContract,
      contractsActive,
      contractsExpired,
      contractsCancelled,
      contractsRefunded,
      paymentsApproved,
      paymentRows,
    ] = await Promise.all([
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.ACTIVE },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.SUSPENDED },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.INACTIVE },
      }),
      this.prisma.member.count({
        where: {
          tenantId,
          status: MemberStatus.ACTIVE,
          contracts: { none: { status: ContractStatus.ACTIVE } },
        },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.ACTIVE },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.EXPIRED },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.CANCELLED },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.REFUNDED },
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          status: PaymentStatus.APPROVED,
          createdAt: { gte: rangeStart, lt: rangeEndExclusive },
          ...(memberId ? { memberId } : {}),
        },
        select: { amount: true, method: true },
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          status: PaymentStatus.APPROVED,
          createdAt: { gte: rangeStart, lt: rangeEndExclusive },
          ...(memberId ? { memberId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: DETAIL_LIMIT,
        include: {
          member: { select: { name: true, email: true } },
          pack: { select: { name: true } },
        },
      }),
    ]);

    const byMethod = {
      CASH: 0,
      MP: 0,
      STUB: 0,
    };
    let totalApproved = 0;
    for (const p of paymentsApproved) {
      totalApproved += p.amount;
      if (p.method === PaymentMethod.CASH) {
        byMethod.CASH += p.amount;
      } else if (p.method === PaymentMethod.MP) {
        byMethod.MP += p.amount;
      } else {
        byMethod.STUB += p.amount;
      }
    }

    const payments: ReportPaymentRow[] = paymentRows.map((row) => ({
      id: row.id,
      amount: row.amount,
      method: row.method,
      status: 'APPROVED',
      createdAt: row.createdAt,
      memberId: row.memberId,
      memberName: row.member.name,
      memberEmail: row.member.email,
      packId: row.packId,
      packName: row.pack?.name ?? null,
      kind: row.sessionId ? 'DROP_IN' : 'PACK',
    }));

    return {
      from,
      to,
      timezone: REPORTS_TIMEZONE,
      members: {
        active: activeMembers,
        suspended: suspendedMembers,
        inactive: inactiveMembers,
        activeWithoutActiveContract: activeWithoutContract,
      },
      contracts: {
        active: contractsActive,
        expired: contractsExpired,
        cancelled: contractsCancelled,
        refunded: contractsRefunded,
      },
      income: {
        totalApproved,
        byMethod,
        payments,
        paymentCount: paymentsApproved.length,
      },
    };
  }

  private assertValidRange(from: string, to: string): void {
    this.parseYmd(from);
    this.parseYmd(to);
    if (from > to) {
      throw new BadRequestException('from must be <= to');
    }
  }

  /**
   * YYYY-MM-DD en timezone BA.
   */
  businessYmd(at: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: REPORTS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  }

  /**
   * Medianoche BA del YMD como instante UTC (offset fijo -03).
   */
  private dayStartUtc(ymd: string): Date {
    this.parseYmd(ymd);
    return new Date(`${ymd}T03:00:00.000Z`);
  }

  private parseYmd(ymd: string): { year: number; month: number; day: number } {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!match) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('date is not a valid calendar day');
    }
    return { year, month, day };
  }

  private addDaysYmd(ymd: string, days: number): string {
    const { year, month, day } = this.parseYmd(ymd);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
