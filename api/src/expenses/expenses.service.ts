import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseMethod, ExpenseNature, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AUDIT_ACTIONS, type AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  businessYmdOf,
  formatBusinessDate,
  parseBusinessDate,
} from '../common/business-date';
import {
  normalizeListQuery,
  toListResult,
  type ListResult,
} from '../common/list';
import { FILE_STORAGE_PORT } from '../file-storage/file-storage.port';
import type { FileStoragePort } from '../file-storage/file-storage.port';
import { FOLDER_MAX_FILE_BYTES } from '../folder/folder.constants';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { EXPENSE_MAX_FILES } from './expenses.constants';
import type {
  ExpenseDetail,
  ExpenseFileBytes,
  ExpenseFileDetail,
  ExpenseLabelDetail,
  ExpensesSummary,
} from './expenses.types';

const FILE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const EXPENSE_INCLUDE = {
  label: { select: { id: true, name: true } },
  recordedByStaff: { select: { name: true, email: true } },
  files: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

type UploadFile = {
  mimetype: string;
  size: number;
  buffer: Buffer;
  originalname: string;
};

/**
 * Gastos del local: etiquetas, asientos y comprobantes.
 *
 * @remarks RN-GAS-001..006. Tenant siempre desde el JWT. No crea
 * `cash_movements`: el arqueo resta los gastos en efectivo del día y Reportes
 * los suma aparte. Comprobantes en R2 privado (`expenses/{tenantId}/…`).
 */
@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(FILE_STORAGE_PORT) private readonly storage: FileStoragePort,
  ) {}

  /**
   * Etiquetas del gym con su cantidad de gastos.
   *
   * @param includeArchived - true en la pantalla de administración; el selector
   * de alta solo ve las activas.
   */
  async listLabels(
    tenantId: string,
    includeArchived: boolean,
  ): Promise<ExpenseLabelDetail[]> {
    const rows = await this.prisma.expenseLabel.findMany({
      where: { tenantId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      archived: r.archivedAt !== null,
      expenseCount: r._count.expenses,
    }));
  }

  /**
   * Crea una etiqueta. Nombre único por gym.
   *
   * @throws {ConflictException} Ya existe una con ese nombre.
   */
  async createLabel(
    tenantId: string,
    nameRaw: string,
  ): Promise<ExpenseLabelDetail> {
    const name = this.labelName(nameRaw);
    try {
      const row = await this.prisma.expenseLabel.create({
        data: { tenantId, name },
      });
      return { id: row.id, name: row.name, archived: false, expenseCount: 0 };
    } catch (error: unknown) {
      this.rethrowDuplicateLabel(error);
      throw error;
    }
  }

  /**
   * Renombra y/o archiva una etiqueta. Archivada: sale del selector, los
   * gastos viejos conservan el nombre (RN-GAS-003).
   */
  async updateLabel(
    tenantId: string,
    labelId: string,
    input: { name?: string; archived?: boolean },
  ): Promise<ExpenseLabelDetail> {
    await this.findLabel(tenantId, labelId);
    const data: Prisma.ExpenseLabelUpdateInput = {};
    if (input.name !== undefined) {
      data.name = this.labelName(input.name);
    }
    if (input.archived !== undefined) {
      data.archivedAt = input.archived ? new Date() : null;
    }
    try {
      const row = await this.prisma.expenseLabel.update({
        where: { id: labelId },
        data,
        include: { _count: { select: { expenses: true } } },
      });
      return {
        id: row.id,
        name: row.name,
        archived: row.archivedAt !== null,
        expenseCount: row._count.expenses,
      };
    } catch (error: unknown) {
      this.rethrowDuplicateLabel(error);
      throw error;
    }
  }

  /**
   * Borra una etiqueta sin gastos.
   *
   * @throws {ConflictException} Tiene gastos: hay que archivarla.
   */
  async deleteLabel(tenantId: string, labelId: string): Promise<void> {
    await this.findLabel(tenantId, labelId);
    const used = await this.prisma.expense.count({
      where: { tenantId, labelId },
    });
    if (used > 0) {
      throw new ConflictException(
        'La etiqueta tiene gastos cargados: archivala en lugar de borrarla.',
      );
    }
    await this.prisma.expenseLabel.delete({ where: { id: labelId } });
  }

  /**
   * Gastos del período (más recientes primero).
   */
  async list(
    tenantId: string,
    query: ListExpensesQueryDto,
  ): Promise<ListResult<ExpenseDetail>> {
    const n = normalizeListQuery(query);
    const { fromDate, toDate } = this.range(query.from, query.to);
    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      businessDate: { gte: fromDate, lte: toDate },
      ...(query.labelId ? { labelId: query.labelId } : {}),
      ...(query.nature ? { nature: query.nature } : {}),
      ...(query.method ? { method: query.method } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: EXPENSE_INCLUDE,
        orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    const closed = await this.closedDays(tenantId, rows);
    return toListResult(
      rows.map((r) => this.toDetail(r, closed)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /** Un gasto con sus comprobantes. */
  async get(tenantId: string, expenseId: string): Promise<ExpenseDetail> {
    const row = await this.findExpense(tenantId, expenseId);
    const closed = await this.closedDays(tenantId, [row]);
    return this.toDetail(row, closed);
  }

  /**
   * Alta de gasto. No pasa por el carrito ni crea `cash_movements`.
   *
   * @throws {BadRequestException} Fecha futura o etiqueta inválida/archivada.
   * @throws {ConflictException} Efectivo en un día con arqueo cerrado.
   */
  async create(
    tenantId: string,
    dto: CreateExpenseDto,
    actor: AuditActor,
  ): Promise<ExpenseDetail> {
    const businessDate = this.resolveDate(dto.businessDate);
    await this.assertActiveLabel(tenantId, dto.labelId);
    await this.assertDayOpenForCash(tenantId, dto.method, businessDate);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          tenantId,
          businessDate,
          amount: dto.amount,
          nature: dto.nature,
          method: dto.method,
          labelId: dto.labelId,
          note: dto.note?.trim() || null,
          recordedByStaffId: actor.userId,
        },
        include: EXPENSE_INCLUDE,
      });
      await this.audit.recordInTx(tx, {
        tenantId,
        actor,
        action: AUDIT_ACTIONS.expenseCreate,
        entityType: 'expense',
        entityId: created.id,
        before: null,
        after: this.auditSnapshot(created),
      });
      return created;
    });
    return this.toDetail(row, new Set());
  }

  /**
   * Edición de gasto.
   *
   * @throws {ConflictException} El gasto (o el destino) es efectivo de un día
   * con arqueo cerrado (RN-GAS-006).
   */
  async update(
    tenantId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
    actor: AuditActor,
  ): Promise<ExpenseDetail> {
    const current = await this.findExpense(tenantId, expenseId);
    await this.assertDayOpenForCash(
      tenantId,
      current.method,
      current.businessDate,
    );

    const businessDate =
      dto.businessDate !== undefined
        ? this.resolveDate(dto.businessDate)
        : current.businessDate;
    const method = dto.method ?? current.method;
    if (dto.labelId !== undefined && dto.labelId !== current.labelId) {
      await this.assertActiveLabel(tenantId, dto.labelId);
    }
    await this.assertDayOpenForCash(tenantId, method, businessDate);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: current.id },
        data: {
          businessDate,
          method,
          amount: dto.amount ?? current.amount,
          nature: dto.nature ?? current.nature,
          labelId: dto.labelId ?? current.labelId,
          note: dto.note !== undefined ? dto.note.trim() || null : current.note,
        },
        include: EXPENSE_INCLUDE,
      });
      await this.audit.recordInTx(tx, {
        tenantId,
        actor,
        action: AUDIT_ACTIONS.expenseUpdate,
        entityType: 'expense',
        entityId: updated.id,
        before: this.auditSnapshot(current),
        after: this.auditSnapshot(updated),
      });
      return updated;
    });
    return this.toDetail(row, new Set());
  }

  /**
   * Baja de gasto y de sus comprobantes en R2.
   *
   * @throws {ConflictException} Efectivo de un día con arqueo cerrado.
   */
  async delete(
    tenantId: string,
    expenseId: string,
    actor: AuditActor,
  ): Promise<void> {
    const current = await this.findExpense(tenantId, expenseId);
    await this.assertDayOpenForCash(
      tenantId,
      current.method,
      current.businessDate,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id: current.id } });
      await this.audit.recordInTx(tx, {
        tenantId,
        actor,
        action: AUDIT_ACTIONS.expenseDelete,
        entityType: 'expense',
        entityId: current.id,
        before: this.auditSnapshot(current),
        after: null,
      });
    });
    await this.deleteObjects(current.files.map((f) => f.storageKey));
  }

  /**
   * Adjunta un PDF o imagen. Máximo {@link EXPENSE_MAX_FILES} por gasto.
   *
   * @remarks Sube a R2 primero y después, con el gasto bloqueado, cuenta e
   * inserta: dos subidas a la vez no pasan el tope. Si la DB falla, se borra
   * el objeto subido. Se puede adjuntar aunque el día tenga arqueo cerrado
   * (no cambia montos).
   */
  async addFile(
    tenantId: string,
    expenseId: string,
    file: UploadFile,
  ): Promise<ExpenseFileDetail> {
    const ext = FILE_TYPES[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Tipo no permitido. Usá PDF, JPG, PNG, WebP o GIF.',
      );
    }
    if (file.size > FOLDER_MAX_FILE_BYTES) {
      throw new BadRequestException('El archivo supera 5 MB.');
    }
    const expense = await this.findExpense(tenantId, expenseId);
    if (expense.files.length >= EXPENSE_MAX_FILES) {
      throw new BadRequestException(this.fullMessage());
    }

    const key = `expenses/${tenantId}/${expense.id}/${randomUUID()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM expenses WHERE id = ${expense.id}::uuid FOR UPDATE`;
        const count = await tx.expenseFile.count({
          where: { expenseId: expense.id },
        });
        if (count >= EXPENSE_MAX_FILES) {
          throw new BadRequestException(this.fullMessage());
        }
        return tx.expenseFile.create({
          data: {
            tenantId,
            expenseId: expense.id,
            storageKey: key,
            originalFilename: this.safeFilename(file.originalname, ext),
            mime: file.mimetype,
            sizeBytes: file.size,
          },
        });
      });
      return this.toFileDetail(row);
    } catch (error: unknown) {
      await this.deleteObjects([key]);
      throw error;
    }
  }

  /** Quita un comprobante (fila y objeto en R2). */
  async deleteFile(
    tenantId: string,
    expenseId: string,
    fileId: string,
  ): Promise<void> {
    const row = await this.prisma.expenseFile.findFirst({
      where: { id: fileId, expenseId, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Comprobante no encontrado');
    }
    await this.prisma.expenseFile.delete({ where: { id: row.id } });
    await this.deleteObjects([row.storageKey]);
  }

  /** Bytes de un comprobante (descarga autenticada, sin URL pública). */
  async getFileBytes(
    tenantId: string,
    expenseId: string,
    fileId: string,
  ): Promise<ExpenseFileBytes> {
    const row = await this.prisma.expenseFile.findFirst({
      where: { id: fileId, expenseId, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Comprobante no encontrado');
    }
    const obj = await this.storage.getObject(row.storageKey);
    return {
      buffer: obj.buffer,
      contentType: row.mime || obj.contentType,
      filename: row.originalFilename,
    };
  }

  /**
   * Totales del período: por naturaleza, medio de pago y etiqueta.
   */
  async summary(
    tenantId: string,
    from?: string,
    to?: string,
  ): Promise<ExpensesSummary> {
    const { fromYmd, toYmd, fromDate, toDate } = this.range(from, to);
    const where = {
      tenantId,
      businessDate: { gte: fromDate, lte: toDate },
    };
    const [byNature, byMethod, byLabel] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['nature'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.groupBy({
        by: ['method'],
        where,
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['labelId'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const labels = await this.prisma.expenseLabel.findMany({
      where: { tenantId, id: { in: byLabel.map((l) => l.labelId) } },
      select: { id: true, name: true },
    });
    const labelName = new Map(labels.map((l) => [l.id, l.name]));

    const natureTotals = { FIXED: 0, VARIABLE: 0 };
    let count = 0;
    for (const g of byNature) {
      natureTotals[g.nature] = g._sum.amount ?? 0;
      count += g._count._all;
    }
    const methodTotals = { CASH: 0, TRANSFER: 0, MP: 0, CARD: 0 };
    for (const g of byMethod) {
      methodTotals[g.method] = g._sum.amount ?? 0;
    }

    return {
      from: fromYmd,
      to: toYmd,
      total: natureTotals.FIXED + natureTotals.VARIABLE,
      count,
      byNature: natureTotals,
      byMethod: methodTotals,
      byLabel: byLabel
        .map((g) => ({
          labelId: g.labelId,
          name: labelName.get(g.labelId) ?? 'Etiqueta',
          total: g._sum.amount ?? 0,
          count: g._count._all,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  private async findExpense(
    tenantId: string,
    expenseId: string,
  ): Promise<ExpenseRow> {
    const row = await this.prisma.expense.findFirst({
      where: { id: expenseId, tenantId },
      include: EXPENSE_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return row;
  }

  private async findLabel(tenantId: string, labelId: string) {
    const label = await this.prisma.expenseLabel.findFirst({
      where: { id: labelId, tenantId },
    });
    if (!label) {
      throw new NotFoundException('Etiqueta no encontrada');
    }
    return label;
  }

  private async assertActiveLabel(
    tenantId: string,
    labelId: string,
  ): Promise<void> {
    const label = await this.prisma.expenseLabel.findFirst({
      where: { id: labelId, tenantId },
      select: { archivedAt: true },
    });
    if (!label) {
      throw new BadRequestException('Etiqueta inválida');
    }
    if (label.archivedAt) {
      throw new BadRequestException('La etiqueta está archivada');
    }
  }

  /**
   * RN-GAS-006: un gasto en efectivo de un día con arqueo cerrado cambiaría
   * el esperado ya guardado.
   */
  private async assertDayOpenForCash(
    tenantId: string,
    method: ExpenseMethod,
    businessDate: Date,
  ): Promise<void> {
    if (method !== ExpenseMethod.CASH) {
      return;
    }
    const closed = await this.prisma.cashReconciliation.findUnique({
      where: { tenantId_businessDate: { tenantId, businessDate } },
      select: { id: true },
    });
    if (closed) {
      throw new ConflictException(
        `El cierre del ${formatBusinessDate(businessDate)} ya está hecho: no se pueden cargar, editar ni borrar gastos en efectivo de ese día.`,
      );
    }
  }

  /** Días (YYYY-MM-DD) con arqueo entre los gastos en efectivo dados. */
  private async closedDays(
    tenantId: string,
    rows: Array<{ method: ExpenseMethod; businessDate: Date }>,
  ): Promise<Set<string>> {
    const dates = rows
      .filter((r) => r.method === ExpenseMethod.CASH)
      .map((r) => r.businessDate);
    if (dates.length === 0) {
      return new Set();
    }
    const closed = await this.prisma.cashReconciliation.findMany({
      where: { tenantId, businessDate: { in: dates } },
      select: { businessDate: true },
    });
    return new Set(closed.map((c) => formatBusinessDate(c.businessDate)));
  }

  private resolveDate(ymd: string | undefined): Date {
    const today = businessYmdOf(new Date());
    const value = ymd ?? today;
    const date = parseBusinessDate(value);
    if (value > today) {
      throw new BadRequestException('No se puede cargar un gasto a futuro');
    }
    return date;
  }

  private range(
    from: string | undefined,
    to: string | undefined,
  ): { fromYmd: string; toYmd: string; fromDate: Date; toDate: Date } {
    const today = businessYmdOf(new Date());
    const fromYmd = from ?? `${today.slice(0, 7)}-01`;
    const toYmd = to ?? today;
    const fromDate = parseBusinessDate(fromYmd);
    const toDate = parseBusinessDate(toYmd);
    if (fromYmd > toYmd) {
      throw new BadRequestException('from must be <= to');
    }
    return { fromYmd, toYmd, fromDate, toDate };
  }

  private labelName(raw: string): string {
    const name = raw.trim();
    if (!name) {
      throw new BadRequestException('Nombre de etiqueta vacío');
    }
    return name;
  }

  private rethrowDuplicateLabel(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Esa etiqueta ya existe');
    }
  }

  private fullMessage(): string {
    return `Un gasto admite hasta ${EXPENSE_MAX_FILES} comprobantes. Quitá uno para subir otro.`;
  }

  private async deleteObjects(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (error: unknown) {
        this.logger.warn(
          `No se pudo borrar ${key} de R2: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private safeFilename(original: string, ext: string): string {
    const base = original.replace(/[/\\]/g, '').trim() || `comprobante.${ext}`;
    return base.slice(0, 180);
  }

  private auditSnapshot(row: {
    businessDate: Date;
    amount: number;
    nature: ExpenseNature;
    method: ExpenseMethod;
    labelId: string;
    note: string | null;
  }): Prisma.InputJsonValue {
    return {
      businessDate: formatBusinessDate(row.businessDate),
      amount: row.amount,
      nature: row.nature,
      method: row.method,
      labelId: row.labelId,
      note: row.note,
    };
  }

  private toFileDetail(row: {
    id: string;
    originalFilename: string;
    mime: string;
    sizeBytes: number;
    createdAt: Date;
  }): ExpenseFileDetail {
    return {
      id: row.id,
      originalFilename: row.originalFilename,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toDetail(row: ExpenseRow, closedDays: Set<string>): ExpenseDetail {
    const ymd = formatBusinessDate(row.businessDate);
    return {
      id: row.id,
      businessDate: ymd,
      amount: row.amount,
      nature: row.nature,
      method: row.method,
      label: row.label,
      note: row.note,
      recordedByName:
        row.recordedByStaff?.name?.trim() || row.recordedByStaff?.email || null,
      files: row.files.map((f) => this.toFileDetail(f)),
      locked: row.method === ExpenseMethod.CASH && closedDays.has(ymd),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
