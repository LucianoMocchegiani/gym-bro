import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CashMovementKind,
  ContractStatus,
  MemberStatus,
  PaymentMethod,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsSummary } from './reports.types';
import {
  LEDGER_MOVEMENT_INCLUDE,
  buildLedgerRows,
} from '../payment/ledger-row';

const REPORTS_TIMEZONE = 'America/Argentina/Buenos_Aires' as const;
const DETAIL_LIMIT = 200;

/**
 * Reportes de dinero + snapshot comercial (E11).
 *
 * Movimientos = caja agrupada por cart (cobros y devoluciones), misma grilla que `/arqueo`.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const fromDate = this.parseBusinessDate(from);
    const toDate = this.parseBusinessDate(to);
    const movementWhere = {
      tenantId,
      businessDate: { gte: fromDate, lte: toDate },
      ...(memberId ? { memberId } : {}),
    };

    const [
      activeMembers,
      suspendedMembers,
      inactiveMembers,
      activeWithoutContract,
      contractsActive,
      contractsExpired,
      contractsCancelled,
      contractsRefunded,
      totalsRows,
      movementRows,
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
      this.prisma.cashMovement.findMany({
        where: movementWhere,
        select: {
          amount: true,
          kind: true,
          transactionItem: { select: { method: true } },
        },
      }),
      this.prisma.cashMovement.findMany({
        where: movementWhere,
        orderBy: { createdAt: 'desc' },
        take: DETAIL_LIMIT * 2,
        include: LEDGER_MOVEMENT_INCLUDE,
      }),
    ]);

    const byMethod = { CASH: 0, MP: 0 };
    let totalApproved = 0;
    let totalRefunded = 0;
    for (const p of totalsRows) {
      if (p.kind === CashMovementKind.OUTCOME) {
        totalRefunded += p.amount;
        continue;
      }
      totalApproved += p.amount;
      if (p.transactionItem.method === PaymentMethod.CASH) {
        byMethod.CASH += p.amount;
      } else if (p.transactionItem.method === PaymentMethod.MP) {
        byMethod.MP += p.amount;
      }
    }

    const transactions = buildLedgerRows(movementRows).slice(0, DETAIL_LIMIT);

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
        totalRefunded,
        byMethod,
        transactions,
        transactionCount: transactions.length,
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

  businessYmd(at: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: REPORTS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  }

  private parseBusinessDate(ymd: string): Date {
    const { year, month, day } = this.parseYmd(ymd);
    return new Date(Date.UTC(year, month - 1, day));
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
}
