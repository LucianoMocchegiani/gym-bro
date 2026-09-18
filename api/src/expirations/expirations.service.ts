import { Injectable } from '@nestjs/common';
import {
  BillingPeriod,
  ContractStatus,
  DebitMandateStatus,
  MemberStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpirationsQueryDto } from './dto/expirations-query.dto';
import {
  ExpirationPayKind,
  ExpirationRow,
  ExpirationsList,
} from './expirations.types';

const TZ = 'America/Argentina/Buenos_Aires' as const;
const WINDOW_DAYS = 7;
const OPEN_MANDATE: DebitMandateStatus[] = [
  DebitMandateStatus.ACTIVE,
  DebitMandateStatus.RETRYING,
  DebitMandateStatus.FAILED,
];

type ContractHit = {
  id: string;
  memberId: string;
  packId: string;
  status: ContractStatus;
  endsAt: Date | null;
  member: { name: string | null; email: string };
  pack: { name: string };
};

/**
 * Arma la lista de MONTHLY por vencer o en tolerancia.
 *
 * @remarks Un contrato por afiliado (ACTIVE gana a EXPIRED). El débito
 * abierto (ACTIVE/RETRYING/FAILED) marca “MP cobra”.
 */
@Injectable()
export class ExpirationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    query: ExpirationsQueryDto,
  ): Promise<ExpirationsList> {
    const today = this.businessYmd(new Date());
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { debtToleranceDays: true },
    });
    const debtToleranceDays = settings?.debtToleranceDays ?? 15;

    const [contracts, mandates] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          tenantId,
          status: { in: [ContractStatus.ACTIVE, ContractStatus.EXPIRED] },
          endsAt: { not: null },
          member: { status: MemberStatus.ACTIVE },
          pack: { billingPeriod: BillingPeriod.MONTHLY },
        },
        select: {
          id: true,
          memberId: true,
          packId: true,
          status: true,
          endsAt: true,
          member: { select: { name: true, email: true } },
          pack: { select: { name: true } },
        },
      }),
      this.prisma.debitMandate.findMany({
        where: { tenantId, status: { in: OPEN_MANDATE } },
        select: { memberId: true, status: true },
      }),
    ]);

    const chosen = this.pickLatestMonthly(contracts);
    const mandateByMember = new Map<string, DebitMandateStatus>();
    for (const m of mandates) {
      const prev = mandateByMember.get(m.memberId);
      if (!prev || this.mandateRank(m.status) > this.mandateRank(prev)) {
        mandateByMember.set(m.memberId, m.status);
      }
    }

    const worklist: ExpirationRow[] = [];
    for (const c of chosen.values()) {
      if (!c.endsAt) {
        continue;
      }
      const endsOn = this.businessYmd(c.endsAt);
      const daysUntil = this.diffDays(today, endsOn);
      const bucket =
        daysUntil >= 0 && daysUntil <= WINDOW_DAYS
          ? ('upcoming' as const)
          : daysUntil < 0 && -daysUntil <= debtToleranceDays
            ? ('tolerance' as const)
            : null;
      if (!bucket) {
        continue;
      }
      const mandateStatus = mandateByMember.get(c.memberId) ?? null;
      worklist.push({
        memberId: c.memberId,
        memberName: c.member.name,
        memberEmail: c.member.email,
        contractId: c.id,
        packId: c.packId,
        packName: c.pack.name,
        endsOn,
        daysUntil,
        bucket,
        payKind: this.payKind(mandateStatus),
        mandateStatus,
      });
    }

    worklist.sort((a, b) => a.daysUntil - b.daysUntil || a.memberEmail.localeCompare(b.memberEmail));

    const counts = {
      total: worklist.length,
      upcoming: worklist.filter((r) => r.bucket === 'upcoming').length,
      tolerance: worklist.filter((r) => r.bucket === 'tolerance').length,
      debit: worklist.filter((r) => r.payKind !== 'manual').length,
      manual: worklist.filter((r) => r.payKind === 'manual').length,
    };

    const view = query.view ?? 'all';
    const pay = query.pay ?? 'all';
    const items = worklist.filter((r) => {
      if (view === 'upcoming' && r.bucket !== 'upcoming') {
        return false;
      }
      if (view === 'tolerance' && r.bucket !== 'tolerance') {
        return false;
      }
      if (pay === 'debit' && r.payKind === 'manual') {
        return false;
      }
      if (pay === 'manual' && r.payKind !== 'manual') {
        return false;
      }
      return true;
    });

    return {
      today,
      timezone: TZ,
      windowDays: WINDOW_DAYS,
      debtToleranceDays,
      counts,
      items,
    };
  }

  private pickLatestMonthly(rows: ContractHit[]): Map<string, ContractHit> {
    const map = new Map<string, ContractHit>();
    for (const row of rows) {
      const prev = map.get(row.memberId);
      if (!prev) {
        map.set(row.memberId, row);
        continue;
      }
      const prevActive = prev.status === ContractStatus.ACTIVE;
      const nextActive = row.status === ContractStatus.ACTIVE;
      if (nextActive && !prevActive) {
        map.set(row.memberId, row);
        continue;
      }
      if (prevActive && !nextActive) {
        continue;
      }
      const prevEnd = prev.endsAt?.getTime() ?? 0;
      const nextEnd = row.endsAt?.getTime() ?? 0;
      if (nextEnd >= prevEnd) {
        map.set(row.memberId, row);
      }
    }
    return map;
  }

  /** FAILED gana: recepción ve el cobro que falló. */
  private mandateRank(status: DebitMandateStatus): number {
    if (status === DebitMandateStatus.FAILED) {
      return 3;
    }
    if (status === DebitMandateStatus.RETRYING) {
      return 2;
    }
    if (status === DebitMandateStatus.ACTIVE) {
      return 1;
    }
    return 0;
  }

  private payKind(status: DebitMandateStatus | null): ExpirationPayKind {
    if (status === DebitMandateStatus.FAILED) {
      return 'debit_failed';
    }
    if (
      status === DebitMandateStatus.ACTIVE ||
      status === DebitMandateStatus.RETRYING
    ) {
      return 'debit';
    }
    return 'manual';
  }

  private businessYmd(at: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  }

  /** Días de calendario `toYmd - fromYmd` (negativo si ya pasó). */
  private diffDays(fromYmd: string, toYmd: string): number {
    const from = Date.parse(`${fromYmd}T00:00:00Z`);
    const to = Date.parse(`${toYmd}T00:00:00Z`);
    return Math.round((to - from) / 86_400_000);
  }
}
