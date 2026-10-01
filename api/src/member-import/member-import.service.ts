import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberImport,
  MemberImportKind,
  MemberImportStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../auth/auth.types';
import { IdentityService } from '../auth/identity.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { FolderService } from '../folder/folder.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import type { UploadFile } from '../upload/upload.service';
import {
  IMPORT_DEFAULT_PASSWORD,
  IMPORT_HISTORY_LIMIT,
} from './member-import.constants';
import {
  NormalizedImportRow,
  RawImportRow,
  normalizeDocument,
  normalizeEmail,
  normalizeImportRow,
} from './member-import.rows';
import type {
  ImportFileMatch,
  ImportItemResult,
  ImportPreviewRow,
  MemberImportDetail,
} from './member-import.types';

type FolderUpload = UploadFile & { originalname: string };

type ExistingIndex = {
  memberEmails: Set<string>;
  memberDocuments: Set<string>;
  identityEmails: Set<string>;
};

type ClassifiedRow =
  | { status: 'new'; row: NormalizedImportRow; linkedAccount: boolean }
  | { status: 'exists' | 'error'; rowNumber: number; reason: string };

/**
 * Migración de afiliados desde otro sistema: ficha, foto y carpeta.
 *
 * @remarks RN-MIG-001..005. El Admin parsea planilla y zip en el navegador y
 * manda lotes; acá se valida por fila, se da de alta y se cuentan resultados.
 * Idempotente: re-subir el mismo archivo omite a los que ya están.
 * Sin mails, avisos, credencial QR, packs ni caja.
 */
@Injectable()
export class MemberImportService {
  private readonly logger = new Logger(MemberImportService.name);
  private defaultHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly identities: IdentityService,
    private readonly audit: AuditService,
    private readonly upload: UploadService,
    private readonly folder: FolderService,
  ) {}

  /**
   * Vista previa de un lote: qué se crearía, qué ya existe y qué tiene error.
   * No escribe nada.
   */
  async preview(
    tenantId: string,
    rows: RawImportRow[],
    branchId?: string,
  ): Promise<ImportPreviewRow[]> {
    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
    }
    const classified = await this.classify(tenantId, rows);
    return classified.map((c) =>
      c.status === 'new'
        ? {
            rowNumber: c.row.rowNumber,
            status: 'new',
            linkedAccount: c.linkedAccount,
          }
        : { rowNumber: c.rowNumber, status: c.status, reason: c.reason },
    );
  }

  /** Últimas corridas del gym (la más reciente primero). */
  async list(tenantId: string): Promise<MemberImportDetail[]> {
    const rows = await this.prisma.memberImport.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: IMPORT_HISTORY_LIMIT,
      include: { createdByStaff: { select: { name: true, email: true } } },
    });
    return rows.map((r) => this.toDetail(r));
  }

  /** Abre una corrida de fichas o de archivos. */
  async start(
    tenantId: string,
    user: AuthUser,
    input: {
      kind: MemberImportKind;
      filename: string;
      totalRows: number;
      mapping?: Record<string, unknown>;
    },
  ): Promise<MemberImportDetail> {
    const row = await this.prisma.memberImport.create({
      data: {
        tenantId,
        kind: input.kind,
        filename: input.filename.trim() || 'archivo',
        totalRows: input.totalRows,
        mapping: (input.mapping as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        createdByStaffId: user.userId,
      },
      include: { createdByStaff: { select: { name: true, email: true } } },
    });
    return this.toDetail(row);
  }

  /**
   * Da de alta un lote de fichas.
   *
   * @remarks RN-MIG-002..004. Cuenta nueva → `ChangeMe123!` temporal. Cuenta
   * Faciliter existente (otro gym) → se vincula sin tocar su contraseña.
   * Ya socio del gym (mail, DNI o cuenta) → omitido. Una transacción por fila.
   */
  async importRows(
    tenantId: string,
    importId: string,
    rows: RawImportRow[],
    branchId?: string,
  ): Promise<ImportItemResult[]> {
    await this.getRunning(tenantId, importId, MemberImportKind.ROWS);
    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
    }
    const classified = await this.classify(tenantId, rows);
    const passwordHash = await this.getDefaultHash();
    const results: ImportItemResult[] = [];

    for (const c of classified) {
      if (c.status !== 'new') {
        results.push({
          rowNumber: c.rowNumber,
          status: c.status === 'exists' ? 'skipped' : 'error',
          reason: c.reason,
        });
        continue;
      }
      results.push(
        await this.createMember(tenantId, c.row, passwordHash, branchId),
      );
    }

    await this.bumpCounters(importId, results);
    return results;
  }

  /**
   * Cruza DNI o mails (nombres de archivo del zip) con socios del gym.
   */
  async matchFiles(
    tenantId: string,
    keys: string[],
  ): Promise<ImportFileMatch[]> {
    const emails = new Set<string>();
    const documents = new Set<string>();
    for (const key of keys) {
      if (key.includes('@')) {
        emails.add(normalizeEmail(key));
      } else {
        const doc = normalizeDocument(key);
        if (doc) {
          documents.add(doc);
        }
      }
    }

    const [byEmail, withDocument] = await Promise.all([
      emails.size
        ? this.prisma.member.findMany({
            where: { tenantId, email: { in: [...emails] } },
            select: { id: true, email: true, name: true, imageUrl: true },
          })
        : Promise.resolve([]),
      documents.size
        ? this.prisma.member.findMany({
            where: { tenantId, document: { not: null } },
            select: {
              id: true,
              document: true,
              name: true,
              imageUrl: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const found = new Map<
      string,
      { id: string; name: string | null; imageUrl: string | null }
    >();
    for (const m of byEmail) {
      found.set(m.email, m);
    }
    for (const m of withDocument) {
      const doc = normalizeDocument(m.document ?? undefined);
      if (doc && documents.has(doc)) {
        found.set(doc, m);
      }
    }

    const ids = [...new Set([...found.values()].map((m) => m.id))];
    const counts = ids.length
      ? await this.prisma.folderItem.groupBy({
          by: ['memberId'],
          where: { tenantId, memberId: { in: ids } },
          _count: { _all: true },
        })
      : [];
    const countById = new Map(
      counts.map((c) => [c.memberId ?? '', c._count._all]),
    );

    return [...found.entries()].map(([key, m]) => ({
      key,
      memberId: m.id,
      name: m.name,
      hasPhoto: Boolean(m.imageUrl),
      folderCount: countById.get(m.id) ?? 0,
    }));
  }

  /**
   * Foto de perfil desde el zip. Si el socio ya tiene foto, no se pisa.
   *
   * @remarks RN-MIG-005: socio con archivos previos a la corrida → no se le
   * carga nada.
   */
  async importPhoto(
    tenantId: string,
    importId: string,
    memberId: string,
    file: UploadFile,
  ): Promise<ImportItemResult> {
    const run = await this.getRunning(
      tenantId,
      importId,
      MemberImportKind.FILES,
    );
    const hasFiles = await this.hasFilesBefore(
      tenantId,
      memberId,
      run.createdAt,
    );
    const result = hasFiles
      ? this.alreadyHasFiles(memberId)
      : await this.savePhoto(tenantId, memberId, file);
    await this.bumpCounters(importId, [result]);
    return result;
  }

  /**
   * Documento de carpeta desde el zip. Mismos topes que el Admin (RN-FOL-006).
   *
   * @remarks Solo socios sin archivos previos a la corrida: re-subir el zip
   * no duplica documentos.
   */
  async importFolderFile(
    tenantId: string,
    user: AuthUser,
    importId: string,
    memberId: string,
    file: FolderUpload,
  ): Promise<ImportItemResult> {
    const run = await this.getRunning(
      tenantId,
      importId,
      MemberImportKind.FILES,
    );
    let result: ImportItemResult;
    if (await this.hasFilesBefore(tenantId, memberId, run.createdAt)) {
      result = this.alreadyHasFiles(memberId);
    } else {
      try {
        await this.folder.createFile(
          tenantId,
          user,
          { kind: 'member', id: memberId },
          file,
          {},
        );
        result = { status: 'created', memberId };
      } catch (error: unknown) {
        result = { status: 'error', memberId, reason: this.reasonOf(error) };
      }
    }
    await this.bumpCounters(importId, [result]);
    return result;
  }

  /**
   * Cierra la corrida y deja una sola entrada de auditoría con los totales.
   *
   * @remarks Idempotente: si ya estaba cerrada devuelve el detalle.
   */
  async finish(
    tenantId: string,
    importId: string,
    actor: AuditActor,
  ): Promise<MemberImportDetail> {
    const current = await this.findInTenant(tenantId, importId);
    if (current.status === MemberImportStatus.DONE) {
      return this.toDetail(current);
    }
    const done = await this.prisma.memberImport.update({
      where: { id: importId },
      data: { status: MemberImportStatus.DONE, finishedAt: new Date() },
      include: { createdByStaff: { select: { name: true, email: true } } },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.memberImport,
      entityType: 'member_import',
      entityId: done.id,
      before: null,
      after: {
        kind: done.kind,
        filename: done.filename,
        totalRows: done.totalRows,
        created: done.createdCount,
        skipped: done.skippedCount,
        failed: done.failedCount,
      },
    });
    return this.toDetail(done);
  }

  private async createMember(
    tenantId: string,
    row: NormalizedImportRow,
    passwordHash: string,
    branchId?: string,
  ): Promise<ImportItemResult> {
    try {
      const memberId = await this.prisma.$transaction(async (tx) => {
        const identity = await this.identities.ensure(tx, {
          email: row.email,
          passwordHash,
          name: row.name,
          passwordTemporary: true,
        });
        const already = await tx.member.findUnique({
          where: {
            tenantId_identityId: { tenantId, identityId: identity.id },
          },
          select: { id: true },
        });
        if (already) {
          return null;
        }
        const member = await tx.member.create({
          data: {
            tenantId,
            identityId: identity.id,
            email: row.email,
            name: row.name,
            phone: row.phone,
            document: row.document,
            branchId: branchId ?? null,
            status: row.status,
          },
          select: { id: true },
        });
        return member.id;
      });
      if (!memberId) {
        return {
          rowNumber: row.rowNumber,
          status: 'skipped',
          reason: 'Ya es socio del gym',
        };
      }
      return { rowNumber: row.rowNumber, status: 'created', memberId };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          rowNumber: row.rowNumber,
          status: 'skipped',
          reason: 'Ya existe un socio con ese mail o DNI',
        };
      }
      this.logger.warn(
        `Import fila ${row.rowNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        rowNumber: row.rowNumber,
        status: 'error',
        reason: this.reasonOf(error),
      };
    }
  }

  private async savePhoto(
    tenantId: string,
    memberId: string,
    file: UploadFile,
  ): Promise<ImportItemResult> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { imageUrl: true },
    });
    if (!member) {
      return { status: 'error', memberId, reason: 'Socio no encontrado' };
    }
    if (member.imageUrl) {
      return { status: 'skipped', memberId, reason: 'Ya tiene foto' };
    }
    let uploaded: { url: string; key: string };
    try {
      uploaded = await this.upload.uploadImage(file, 'members', tenantId);
    } catch (error: unknown) {
      return { status: 'error', memberId, reason: this.reasonOf(error) };
    }
    const updated = await this.prisma.member.updateMany({
      where: { id: memberId, tenantId, imageUrl: null },
      data: { imageUrl: uploaded.url },
    });
    if (updated.count === 0) {
      await this.upload.deleteFile(uploaded.key);
      return { status: 'skipped', memberId, reason: 'Ya tiene foto' };
    }
    return { status: 'created', memberId };
  }

  /**
   * Normaliza y clasifica un lote contra lo que ya hay en el gym.
   *
   * @remarks Repetidos dentro del lote → error en la segunda aparición.
   * DNI se compara sin puntos ni guiones (también contra fichas viejas).
   */
  private async classify(
    tenantId: string,
    rows: RawImportRow[],
  ): Promise<ClassifiedRow[]> {
    const normalized = rows.map((r) => normalizeImportRow(r));
    const valid = normalized.flatMap((n) => (n.ok ? [n.row] : []));
    const existing = await this.loadExisting(tenantId, valid);
    const seenEmail = new Map<string, number>();
    const seenDocument = new Map<string, number>();

    return normalized.map((n): ClassifiedRow => {
      if (!n.ok) {
        return { status: 'error', rowNumber: n.rowNumber, reason: n.reason };
      }
      const { row } = n;
      const dupEmail = seenEmail.get(row.email);
      if (dupEmail !== undefined) {
        return {
          status: 'error',
          rowNumber: row.rowNumber,
          reason: `Mail repetido en la planilla (fila ${dupEmail})`,
        };
      }
      seenEmail.set(row.email, row.rowNumber);
      if (row.document) {
        const dupDoc = seenDocument.get(row.document);
        if (dupDoc !== undefined) {
          return {
            status: 'error',
            rowNumber: row.rowNumber,
            reason: `DNI repetido en la planilla (fila ${dupDoc})`,
          };
        }
        seenDocument.set(row.document, row.rowNumber);
      }
      if (existing.memberEmails.has(row.email)) {
        return {
          status: 'exists',
          rowNumber: row.rowNumber,
          reason: 'Ya es socio del gym (mail)',
        };
      }
      if (row.document && existing.memberDocuments.has(row.document)) {
        return {
          status: 'exists',
          rowNumber: row.rowNumber,
          reason: 'Ya hay un socio con ese DNI',
        };
      }
      return {
        status: 'new',
        row,
        linkedAccount: existing.identityEmails.has(row.email),
      };
    });
  }

  private async loadExisting(
    tenantId: string,
    rows: NormalizedImportRow[],
  ): Promise<ExistingIndex> {
    const emails = [...new Set(rows.map((r) => r.email))];
    const hasDocuments = rows.some((r) => r.document);
    if (!emails.length) {
      return {
        memberEmails: new Set(),
        memberDocuments: new Set(),
        identityEmails: new Set(),
      };
    }
    const [members, documents, identities] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          tenantId,
          OR: [
            { email: { in: emails } },
            { identity: { email: { in: emails } } },
          ],
        },
        select: { email: true, identity: { select: { email: true } } },
      }),
      hasDocuments
        ? this.prisma.member.findMany({
            where: { tenantId, document: { not: null } },
            select: { document: true },
          })
        : Promise.resolve([]),
      this.prisma.identity.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      }),
    ]);
    const memberEmails = new Set<string>();
    for (const m of members) {
      memberEmails.add(m.email.toLowerCase());
      memberEmails.add(m.identity.email.toLowerCase());
    }
    const memberDocuments = new Set<string>();
    for (const d of documents) {
      const doc = normalizeDocument(d.document ?? undefined);
      if (doc) {
        memberDocuments.add(doc);
      }
    }
    return {
      memberEmails,
      memberDocuments,
      identityEmails: new Set(identities.map((i) => i.email)),
    };
  }

  private async bumpCounters(
    importId: string,
    results: ImportItemResult[],
  ): Promise<void> {
    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'error').length;
    await this.prisma.memberImport.update({
      where: { id: importId },
      data: {
        createdCount: { increment: created },
        skippedCount: { increment: skipped },
        failedCount: { increment: failed },
      },
    });
  }

  /** Ítems de carpeta cargados antes de que arrancara esta corrida. */
  private async hasFilesBefore(
    tenantId: string,
    memberId: string,
    since: Date,
  ): Promise<boolean> {
    const count = await this.prisma.folderItem.count({
      where: { tenantId, memberId, createdAt: { lt: since } },
    });
    return count > 0;
  }

  private alreadyHasFiles(memberId: string): ImportItemResult {
    return {
      status: 'skipped',
      memberId,
      reason: 'El socio ya tiene archivos cargados',
    };
  }

  private getDefaultHash(): Promise<string> {
    this.defaultHash ??= bcrypt.hash(IMPORT_DEFAULT_PASSWORD, 12);
    return this.defaultHash;
  }

  private async getRunning(
    tenantId: string,
    importId: string,
    kind: MemberImportKind,
  ): Promise<MemberImport> {
    const row = await this.findInTenant(tenantId, importId);
    if (row.status !== MemberImportStatus.RUNNING) {
      throw new BadRequestException('Esa importación ya terminó');
    }
    if (row.kind !== kind) {
      throw new BadRequestException('Tipo de importación incorrecto');
    }
    return row;
  }

  private async findInTenant(tenantId: string, importId: string) {
    const row = await this.prisma.memberImport.findFirst({
      where: { id: importId, tenantId },
      include: { createdByStaff: { select: { name: true, email: true } } },
    });
    if (!row) {
      throw new NotFoundException('Importación no encontrada');
    }
    return row;
  }

  private async assertBranchInTenant(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('La sede no pertenece al gym');
    }
  }

  private reasonOf(error: unknown): string {
    if (error instanceof HttpException) {
      const res = error.getResponse();
      if (typeof res === 'string') {
        return res;
      }
      const message = (res as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      return error.message;
    }
    return 'Error inesperado';
  }

  private toDetail(
    row: MemberImport & {
      createdByStaff: { name: string | null; email: string } | null;
    },
  ): MemberImportDetail {
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      filename: row.filename,
      totalRows: row.totalRows,
      createdCount: row.createdCount,
      skippedCount: row.skippedCount,
      failedCount: row.failedCount,
      mapping: row.mapping,
      createdByName:
        row.createdByStaff?.name?.trim() || row.createdByStaff?.email || null,
      createdAt: row.createdAt.toISOString(),
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    };
  }
}
