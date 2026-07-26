import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CashMovementConcept,
  CashMovementKind,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashDayDetail, CashMovementDetail } from './cash-register.types';

export const CASH_REGISTER_TIMEZONE = 'America/Argentina/Buenos_Aires' as const;

type Tx = Prisma.TransactionClient;

/**
 * Caja del día y movimientos por cobros CASH (CU-PAG-002 / RN-PAG-007).
 *
 * @remarks STUB no genera movimiento. Día operativo en timezone BA.
 * Arqueo diferido (CU-PAG-003 parcial).
 */
@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Si el pago es CASH, registra ingreso de caja en la misma transacción.
   *
   * @remarks No-op para STUB u otros métodos. 1 movimiento por payment (unique).
   */
  async recordIncomeIfCash(
    tx: Tx,
    input: {
      tenantId: string;
      paymentId: string;
      memberId: string;
      amount: number;
      method: PaymentMethod;
      concept: CashMovementConcept;
      recordedByStaffId: string | null;
      at?: Date;
    },
  ): Promise<void> {
    if (input.method !== PaymentMethod.CASH) {
      return;
    }
    if (input.amount < 1) {
      throw new BadRequestException('Cash movement amount must be >= 1');
    }

    await tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        businessDate: this.businessDate(input.at ?? new Date()),
        paymentId: input.paymentId,
        memberId: input.memberId,
        recordedByStaffId: input.recordedByStaffId,
        amount: input.amount,
        kind: CashMovementKind.INCOME,
        concept: input.concept,
      },
    });
  }

  /**
   * Consulta la caja de un día operativo (default: hoy en BA).
   */
  async getDay(tenantId: string, dateYmd?: string): Promise<CashDayDetail> {
    const businessDate = dateYmd
      ? this.parseBusinessDate(dateYmd)
      : this.businessDate(new Date());

    const rows = await this.prisma.cashMovement.findMany({
      where: { tenantId, businessDate },
      include: {
        member: { select: { id: true, name: true } },
        recordedByStaff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const movements = rows.map((row) => this.toMovementDetail(row));
    const income = movements.reduce((sum, m) => sum + m.amount, 0);

    return {
      tenantId,
      businessDate: this.formatBusinessDate(businessDate),
      timezone: CASH_REGISTER_TIMEZONE,
      totals: {
        income,
        movementCount: movements.length,
      },
      movements,
    };
  }

  /**
   * Día calendario YYYY-MM-DD en timezone del gym → Date @db.Date (UTC midnight).
   */
  businessDate(at: Date): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: CASH_REGISTER_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const ymd = formatter.format(at);
    return this.parseBusinessDate(ymd);
  }

  private parseBusinessDate(ymd: string): Date {
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
    return date;
  }

  private formatBusinessDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toMovementDetail(row: {
    id: string;
    tenantId: string;
    businessDate: Date;
    paymentId: string;
    memberId: string;
    recordedByStaffId: string | null;
    amount: number;
    kind: CashMovementKind;
    concept: CashMovementConcept;
    createdAt: Date;
    member: { id: string; name: string | null };
    recordedByStaff: { id: string; name: string | null } | null;
  }): CashMovementDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      businessDate: this.formatBusinessDate(row.businessDate),
      paymentId: row.paymentId,
      memberId: row.memberId,
      memberName: row.member.name,
      recordedByStaffId: row.recordedByStaffId,
      recordedByStaffName: row.recordedByStaff?.name ?? null,
      amount: row.amount,
      kind: row.kind,
      concept: row.concept,
      createdAt: row.createdAt,
    };
  }
}
