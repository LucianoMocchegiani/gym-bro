import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessIdentityLink, AccessProvider, Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessIdentityLinkDetail, AccessSubject } from './access.types';

/**
 * Vínculos número de aparato ZKTeco → socio o staff (RN-ACC-011).
 *
 * @remarks Tabla aparte para no ensuciar la ficha. Un número es único por gym y
 * proveedor. Sin vínculo, ZKTeco busca el socio por DNI.
 */
@Injectable()
export class AccessIdentityLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Vínculos de un socio o staff del tenant.
   *
   * @throws {NotFoundException} Si el socio/staff no existe en el tenant.
   */
  async list(
    tenantId: string,
    subject: AccessSubject,
  ): Promise<AccessIdentityLinkDetail[]> {
    await this.assertSubject(tenantId, subject);
    const rows = await this.prisma.accessIdentityLink.findMany({
      where: { tenantId, ...this.subjectWhere(subject) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDetail(row));
  }

  /**
   * Vincula un número de usuario del aparato ZKTeco.
   *
   * @throws {NotFoundException} Si el socio/staff no existe en el tenant.
   * @throws {ConflictException} Si el número ya está vinculado en el gym.
   */
  async create(
    tenantId: string,
    subject: AccessSubject,
    externalId: string,
    actor: AuditActor,
  ): Promise<AccessIdentityLinkDetail> {
    await this.assertSubject(tenantId, subject);
    const value = externalId.trim();
    try {
      const row = await this.prisma.accessIdentityLink.create({
        data: {
          tenantId,
          provider: AccessProvider.ZKTECO,
          externalId: value,
          ...this.subjectWhere(subject),
        },
      });
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.accessLinkCreate,
        entityType: 'access_identity_link',
        entityId: row.id,
        after: {
          provider: row.provider,
          externalId: row.externalId,
          memberId: row.memberId,
          staffUserId: row.staffUserId,
        },
      });
      return this.toDetail(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El número ${value} ya está vinculado a otra persona en este gym.`,
        );
      }
      throw error;
    }
  }

  /**
   * Quita un vínculo del socio o staff.
   *
   * @throws {NotFoundException} Si el vínculo no es de ese socio/staff en el tenant.
   */
  async remove(
    tenantId: string,
    subject: AccessSubject,
    linkId: string,
    actor: AuditActor,
  ): Promise<void> {
    const row = await this.prisma.accessIdentityLink.findFirst({
      where: { id: linkId, tenantId, ...this.subjectWhere(subject) },
    });
    if (!row) {
      throw new NotFoundException(`Access link ${linkId} not found`);
    }
    await this.prisma.accessIdentityLink.delete({ where: { id: row.id } });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.accessLinkDelete,
      entityType: 'access_identity_link',
      entityId: row.id,
      before: {
        provider: row.provider,
        externalId: row.externalId,
        memberId: row.memberId,
        staffUserId: row.staffUserId,
      },
    });
  }

  private subjectWhere(
    subject: AccessSubject,
  ): { memberId: string } | { staffUserId: string } {
    return subject.kind === 'member'
      ? { memberId: subject.memberId }
      : { staffUserId: subject.staffUserId };
  }

  private async assertSubject(
    tenantId: string,
    subject: AccessSubject,
  ): Promise<void> {
    const found =
      subject.kind === 'member'
        ? await this.prisma.member.findFirst({
            where: { id: subject.memberId, tenantId },
            select: { id: true },
          })
        : await this.prisma.staffUser.findFirst({
            where: { id: subject.staffUserId, tenantId },
            select: { id: true },
          });
    if (!found) {
      throw new NotFoundException(
        subject.kind === 'member' ? 'Member not found' : 'Staff not found',
      );
    }
  }

  private toDetail(row: AccessIdentityLink): AccessIdentityLinkDetail {
    return {
      id: row.id,
      provider: row.provider,
      externalId: row.externalId,
      memberId: row.memberId,
      staffUserId: row.staffUserId,
      createdAt: row.createdAt,
    };
  }
}
