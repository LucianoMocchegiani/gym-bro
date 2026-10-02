import { ConflictException, Injectable } from '@nestjs/common';
import { AccessProvider, MemberImportKind, Prisma } from '@prisma/client';
import { ACCESS_EXTERNAL_ID_PATTERN } from '../access/dto/zkteco-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { MemberImportService } from './member-import.service';
import { normalizeDocument, normalizeEmail } from './member-import.rows';
import type { ImportItemResult, ImportPreviewRow } from './member-import.types';

/** Fila de la planilla de números (todo texto). */
export type RawAccessCodeRow = {
  rowNumber: number;
  document?: string;
  email?: string;
  externalId?: string;
};

type ClassifiedCode =
  | { status: 'new'; rowNumber: number; memberId: string; externalId: string }
  | { status: 'exists' | 'error'; rowNumber: number; reason: string };

type MemberRef = { id: string };

/**
 * Migración masiva de números del aparato ZKTeco → socio (RN-MIG-006).
 *
 * @remarks Mismo modelo que las fichas: vista previa sin escribir, alta por
 * lotes dentro de una corrida `ACCESS_CODES` y una sola auditoría al cerrar.
 * Re-subir la planilla omite los vínculos que ya están.
 */
@Injectable()
export class MemberImportAccessCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly imports: MemberImportService,
  ) {}

  /** Qué se vincularía, qué ya estaba y qué tiene error. No escribe. */
  async preview(
    tenantId: string,
    rows: RawAccessCodeRow[],
  ): Promise<ImportPreviewRow[]> {
    await this.assertZkteco(tenantId);
    const classified = await this.classify(tenantId, rows);
    return classified.map((c) =>
      c.status === 'new'
        ? { rowNumber: c.rowNumber, status: 'new' }
        : { rowNumber: c.rowNumber, status: c.status, reason: c.reason },
    );
  }

  /**
   * Vincula un lote dentro de una corrida abierta.
   *
   * @remarks Sin auditoría por vínculo: la corrida deja una con totales.
   */
  async importRows(
    tenantId: string,
    importId: string,
    rows: RawAccessCodeRow[],
  ): Promise<ImportItemResult[]> {
    await this.imports.getRunning(
      tenantId,
      importId,
      MemberImportKind.ACCESS_CODES,
    );
    await this.assertZkteco(tenantId);
    const classified = await this.classify(tenantId, rows);
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
      results.push(await this.createLink(tenantId, c));
    }
    await this.imports.bumpCounters(importId, results);
    return results;
  }

  private async createLink(
    tenantId: string,
    c: Extract<ClassifiedCode, { status: 'new' }>,
  ): Promise<ImportItemResult> {
    try {
      await this.prisma.accessIdentityLink.create({
        data: {
          tenantId,
          provider: AccessProvider.ZKTECO,
          externalId: c.externalId,
          memberId: c.memberId,
        },
      });
      return {
        rowNumber: c.rowNumber,
        status: 'created',
        memberId: c.memberId,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          rowNumber: c.rowNumber,
          status: 'error',
          reason: 'El número ya está vinculado a otra persona',
        };
      }
      throw error;
    }
  }

  /**
   * Socio por DNI (sin puntos ni guiones) y, si no aparece, por mail.
   * Número repetido dentro del lote → error en la segunda aparición.
   */
  private async classify(
    tenantId: string,
    rows: RawAccessCodeRow[],
  ): Promise<ClassifiedCode[]> {
    const [byDocument, byEmail] = await this.loadMembers(tenantId, rows);
    const externalIds = [
      ...new Set(rows.map((r) => r.externalId?.trim() ?? '').filter(Boolean)),
    ];
    const links = externalIds.length
      ? await this.prisma.accessIdentityLink.findMany({
          where: {
            tenantId,
            provider: AccessProvider.ZKTECO,
            externalId: { in: externalIds },
          },
          select: { externalId: true, memberId: true },
        })
      : [];
    const linkByExternal = new Map(links.map((l) => [l.externalId, l]));
    const seen = new Map<string, number>();

    return rows.map((row): ClassifiedCode => {
      const rowNumber = row.rowNumber;
      const externalId = row.externalId?.trim() ?? '';
      if (!externalId) {
        return { status: 'error', rowNumber, reason: 'Falta el número' };
      }
      if (!ACCESS_EXTERNAL_ID_PATTERN.test(externalId)) {
        return {
          status: 'error',
          rowNumber,
          reason: `Número inválido: ${externalId} (letras, números, - o _, hasta 32)`,
        };
      }
      const doc = normalizeDocument(row.document);
      const email = normalizeEmail(row.email);
      if (!doc && !email) {
        return { status: 'error', rowNumber, reason: 'Falta el DNI o el mail' };
      }
      const member =
        (doc ? byDocument.get(doc) : undefined) ??
        (email ? byEmail.get(email) : undefined);
      if (!member) {
        return {
          status: 'error',
          rowNumber,
          reason: `No hay socio con ese ${doc ? 'DNI' : 'mail'}`,
        };
      }
      const dup = seen.get(externalId);
      if (dup !== undefined) {
        return {
          status: 'error',
          rowNumber,
          reason: `Número repetido en la planilla (fila ${dup})`,
        };
      }
      seen.set(externalId, rowNumber);
      const link = linkByExternal.get(externalId);
      if (link) {
        return link.memberId === member.id
          ? { status: 'exists', rowNumber, reason: 'Ya estaba vinculado' }
          : {
              status: 'error',
              rowNumber,
              reason: 'El número ya está vinculado a otra persona',
            };
      }
      return { status: 'new', rowNumber, memberId: member.id, externalId };
    });
  }

  private async loadMembers(
    tenantId: string,
    rows: RawAccessCodeRow[],
  ): Promise<[Map<string, MemberRef>, Map<string, MemberRef>]> {
    const emails = [
      ...new Set(rows.map((r) => normalizeEmail(r.email)).filter(Boolean)),
    ];
    const hasDocuments = rows.some((r) => normalizeDocument(r.document));
    const [withDocument, withEmail] = await Promise.all([
      hasDocuments
        ? this.prisma.member.findMany({
            where: { tenantId, document: { not: null } },
            select: { id: true, document: true },
          })
        : Promise.resolve([]),
      emails.length
        ? this.prisma.member.findMany({
            where: {
              tenantId,
              OR: [
                { email: { in: emails } },
                { identity: { email: { in: emails } } },
              ],
            },
            select: {
              id: true,
              email: true,
              identity: { select: { email: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const byDocument = new Map<string, MemberRef>();
    for (const m of withDocument) {
      const doc = normalizeDocument(m.document ?? undefined);
      if (doc) {
        byDocument.set(doc, { id: m.id });
      }
    }
    const byEmail = new Map<string, MemberRef>();
    for (const m of withEmail) {
      byEmail.set(m.email.toLowerCase(), { id: m.id });
      byEmail.set(m.identity.email.toLowerCase(), { id: m.id });
    }
    return [byDocument, byEmail];
  }

  private async assertZkteco(tenantId: string): Promise<void> {
    const provider = await this.tenantSettings.getAccessProvider(tenantId);
    if (provider !== AccessProvider.ZKTECO) {
      throw new ConflictException(
        'Este gym no usa acceso ZKTeco: no hay números del aparato para importar.',
      );
    }
  }
}
