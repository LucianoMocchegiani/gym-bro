import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CashMovementConcept,
  CashMovementKind,
  ExpenseMethod,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReconcileCashDayDto } from './dto/reconcile-cash-day.dto';
import { CashDayDetail, CashReconciliationDetail } from './register.types';
import {
  LEDGER_MOVEMENT_INCLUDE,
  buildLedgerRows,
} from '../payment/ledger-row';

export const CASH_REGISTER_TIMEZONE = 'America/Argentina/Buenos_Aires' as const;

type Tx = Prisma.TransactionClient;

/**
 * Gestión de caja y arqueo.
 *
 * @description
 * - Movimientos de caja (ingresos y egresos de cualquier método de pago)
 * - Arqueo diario
 * - Apertura y cierre de caja
 *
 * @remarks
 * Registra movimientos de CUALQUIER método (CASH, MP, STUB): la grilla del día
 * muestra todos. El esperado del arqueo, en cambio, es solo la gaveta:
 * cobros en efectivo − devoluciones en efectivo − gastos en efectivo
 * (RN-PAG-007 / RN-GAS-004).
 */
@Injectable()
export class PaymentRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registra un ingreso de caja (cualquier método de pago).
   *
   * @param tx - Transacción Prisma (para atomicidad)
   * @param input - Datos del movimiento
   */
  async recordIncome(
    tx: Tx,
    input: {
      tenantId: string;
      transactionItemId: string;
      memberId: string | null;
      amount: number;
      method: PaymentMethod;
      concept: CashMovementConcept;
      recordedByStaffId: string | null;
      at?: Date;
    },
  ): Promise<void> {
    if (input.amount < 1) {
      throw new BadRequestException('Cash movement amount must be >= 1');
    }

    const existing = await tx.cashMovement.findUnique({
      where: {
        transactionItemId_kind: {
          transactionItemId: input.transactionItemId,
          kind: CashMovementKind.INCOME,
        },
      },
      select: { id: true, recordedByStaffId: true },
    });
    if (existing) {
      if (!existing.recordedByStaffId && input.recordedByStaffId) {
        await tx.cashMovement.update({
          where: { id: existing.id },
          data: { recordedByStaffId: input.recordedByStaffId },
        });
      }
      return;
    }

    await tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        businessDate: this.businessDate(input.at ?? new Date()),
        transactionItemId: input.transactionItemId,
        memberId: input.memberId ?? undefined,
        recordedByStaffId: input.recordedByStaffId,
        amount: input.amount,
        kind: CashMovementKind.INCOME,
        concept: input.concept,
      },
    });
  }

  /**
   * Registra un egreso de caja (devolución).
   *
   * @param tx - Transacción Prisma
   * @param input - Datos del movimiento
   */
  async recordOutcome(
    tx: Tx,
    input: {
      tenantId: string;
      transactionItemId: string;
      memberId: string | null;
      amount: number;
      concept: CashMovementConcept;
      recordedByStaffId: string | null;
      at?: Date;
      receiptId?: string | null;
    },
  ): Promise<void> {
    if (input.amount < 1) {
      throw new BadRequestException('Cash movement amount must be >= 1');
    }

    const at = input.at ?? new Date();
    await tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        businessDate: this.businessDate(at),
        transactionItemId: input.transactionItemId,
        memberId: input.memberId ?? undefined,
        recordedByStaffId: input.recordedByStaffId,
        receiptId: input.receiptId ?? null,
        amount: input.amount,
        kind: CashMovementKind.OUTCOME,
        concept: input.concept,
        createdAt: at,
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

    const [rows, reconciliation, cash, digital] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where: { tenantId, businessDate },
        include: LEDGER_MOVEMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.cashReconciliation.findUnique({
        where: {
          tenantId_businessDate: { tenantId, businessDate },
        },
        include: {
          reconciledByStaff: { select: { id: true, name: true } },
        },
      }),
      this.cashTotals(tenantId, businessDate),
      this.digitalTotals(tenantId, businessDate),
    ]);

    const movements = buildLedgerRows(rows);
    const income = rows
      .filter((m) => m.kind === CashMovementKind.INCOME)
      .reduce((sum, m) => sum + m.amount, 0);
    const outcome = rows
      .filter((m) => m.kind === CashMovementKind.OUTCOME)
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      tenantId,
      businessDate: this.formatBusinessDate(businessDate),
      timezone: CASH_REGISTER_TIMEZONE,
      totals: {
        income,
        outcome,
        net: income - outcome,
        movementCount: movements.length,
      },
      cash,
      digital,
      movements,
      reconciliation: reconciliation
        ? this.toReconciliationDetail(reconciliation)
        : null,
    };
  }

  /**
   * Registra el arqueo del día (efectivo contado vs esperado).
   *
   * @throws {BadRequestException} Día futuro o declarado inválido.
   * @throws {ConflictException} Ya existe arqueo para ese día.
   */
  async reconcileDay(
    tenantId: string,
    dto: ReconcileCashDayDto,
    actor: AuditActor,
  ): Promise<CashDayDetail> {
    const businessDate = dto.date
      ? this.parseBusinessDate(dto.date)
      : this.businessDate(new Date());
    this.assertNotFutureBusinessDate(businessDate);

    const existing = await this.prisma.cashReconciliation.findUnique({
      where: {
        tenantId_businessDate: { tenantId, businessDate },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Cash day already reconciled for this business date',
      );
    }

    const { expected: expectedAmount } = await this.cashTotals(
      tenantId,
      businessDate,
    );
    const declaredAmount = dto.declaredAmount;
    const difference = declaredAmount - expectedAmount;
    const note = dto.note?.trim() || null;
    const reconciledByStaffId =
      actor.profileType === 'STAFF' ? actor.userId : null;

    try {
      const created = await this.prisma.cashReconciliation.create({
        data: {
          tenantId,
          businessDate,
          expectedAmount,
          declaredAmount,
          difference,
          reconciledByStaffId,
          note,
        },
        include: {
          reconciledByStaff: { select: { id: true, name: true } },
        },
      });

      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.cashReconcile,
        entityType: 'cash_reconciliation',
        entityId: created.id,
        before: null,
        after: {
          businessDate: this.formatBusinessDate(businessDate),
          expectedAmount,
          declaredAmount,
          difference,
          note,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Cash day already reconciled for this business date',
        );
      }
      throw error;
    }

    return this.getDay(tenantId, this.formatBusinessDate(businessDate));
  }

  /**
   * Efectivo de la gaveta en el día: cobros y devoluciones CASH y gastos
   * pagados en efectivo. MP y transferencias no pasan por la caja física.
   */
  private cashTotals(
    tenantId: string,
    businessDate: Date,
  ): Promise<CashDayDetail['cash']> {
    return this.channelTotals(tenantId, businessDate, 'cash');
  }

  /**
   * Lo que no pasa por la gaveta: cobros y devoluciones MP y gastos por
   * transferencia, MP o tarjeta. Informativo; no entra al arqueo.
   */
  private digitalTotals(
    tenantId: string,
    businessDate: Date,
  ): Promise<CashDayDetail['digital']> {
    return this.channelTotals(tenantId, businessDate, 'digital');
  }

  private async channelTotals(
    tenantId: string,
    businessDate: Date,
    channel: 'cash' | 'digital',
  ): Promise<CashDayDetail['cash']> {
    const isCash = channel === 'cash';
    const itemFilter = {
      transactionItem: {
        method: isCash ? PaymentMethod.CASH : { not: PaymentMethod.CASH },
      },
    };
    const [incomeAgg, outcomeAgg, expensesAgg] = await Promise.all([
      this.prisma.cashMovement.aggregate({
        where: {
          tenantId,
          businessDate,
          kind: CashMovementKind.INCOME,
          ...itemFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.cashMovement.aggregate({
        where: {
          tenantId,
          businessDate,
          kind: CashMovementKind.OUTCOME,
          ...itemFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          businessDate,
          method: isCash ? ExpenseMethod.CASH : { not: ExpenseMethod.CASH },
        },
        _sum: { amount: true },
      }),
    ]);
    const income = incomeAgg._sum.amount ?? 0;
    const outcome = outcomeAgg._sum.amount ?? 0;
    const expenses = expensesAgg._sum.amount ?? 0;
    return { income, outcome, expenses, expected: income - outcome - expenses };
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

  private assertNotFutureBusinessDate(businessDate: Date): void {
    const today = this.businessDate(new Date());
    if (businessDate.getTime() > today.getTime()) {
      throw new BadRequestException('Cannot reconcile a future business date');
    }
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

  private toReconciliationDetail(row: {
    id: string;
    tenantId: string;
    businessDate: Date;
    expectedAmount: number;
    declaredAmount: number;
    difference: number;
    reconciledByStaffId: string | null;
    note: string | null;
    createdAt: Date;
    reconciledByStaff: { id: string; name: string | null } | null;
  }): CashReconciliationDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      businessDate: this.formatBusinessDate(row.businessDate),
      expectedAmount: row.expectedAmount,
      declaredAmount: row.declaredAmount,
      difference: row.difference,
      reconciledByStaffId: row.reconciledByStaffId,
      reconciledByStaffName: row.reconciledByStaff?.name ?? null,
      note: row.note,
      createdAt: row.createdAt,
    };
  }
}
