import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessCredential,
  AccessCredentialStatus,
  MemberStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_IDENTITY_PROVIDER,
  AccessIdentityProvider,
  ResolvePresentationInput,
  ResolvedPresentation,
} from './access-identity.port';
import { AccessCredentialDetail } from './access.types';

/**
 * Emisión / revocación de credenciales de vínculo (E6 / RN-ACC-002).
 *
 * @remarks Una sola ACTIVE por member. Reemitir revoca la anterior.
 * `resolvePresentation` queda listo para `POST /access/verify` (siguiente slice).
 */
@Injectable()
export class AccessCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ACCESS_IDENTITY_PROVIDER)
    private readonly identity: AccessIdentityProvider,
  ) {}

  /**
   * Credencial ACTIVE del afiliado autenticado, o `null`.
   */
  async getActiveForMember(
    tenantId: string,
    memberId: string,
  ): Promise<AccessCredentialDetail | null> {
    await this.requireMember(tenantId, memberId);
    const row = await this.prisma.accessCredential.findFirst({
      where: {
        tenantId,
        memberId,
        status: AccessCredentialStatus.ACTIVE,
      },
    });
    return row ? this.toDetail(row) : null;
  }

  /**
   * Historial de credenciales del member (más recientes primero).
   */
  async listForMember(
    tenantId: string,
    memberId: string,
  ): Promise<AccessCredentialDetail[]> {
    await this.requireMember(tenantId, memberId);
    const rows = await this.prisma.accessCredential.findMany({
      where: { tenantId, memberId },
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map((r) => this.toDetail(r));
  }

  /**
   * Emite (o reemite) credencial ACTIVE. Revoca la ACTIVE previa si existe.
   *
   * @throws {NotFoundException} Member inexistente en el tenant.
   * @throws {BadRequestException} Member no ACTIVE.
   */
  async issue(
    tenantId: string,
    memberId: string,
    actor: AuditActor,
  ): Promise<AccessCredentialDetail> {
    const member = await this.requireMember(tenantId, memberId);
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE to issue credential');
    }

    const issued = await this.identity.issueMembershipCredential({
      tenantId,
      memberId,
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.accessCredential.findFirst({
        where: {
          tenantId,
          memberId,
          status: AccessCredentialStatus.ACTIVE,
        },
      });
      if (current) {
        await tx.accessCredential.update({
          where: { id: current.id },
          data: {
            status: AccessCredentialStatus.REVOKED,
            revokedAt: new Date(),
          },
        });
        await this.identity.revokeCredential(current.credentialRef);
        await this.audit.recordInTx(tx, {
          tenantId,
          actor,
          action: AUDIT_ACTIONS.accessCredentialRevoke,
          entityType: 'access_credential',
          entityId: current.id,
          before: { status: AccessCredentialStatus.ACTIVE },
          after: {
            status: AccessCredentialStatus.REVOKED,
            reason: 'reissue',
          },
        });
      }

      return tx.accessCredential.create({
        data: {
          tenantId,
          memberId,
          credentialRef: issued.credentialRef,
          provider: issued.provider,
          status: AccessCredentialStatus.ACTIVE,
        },
      });
    });

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.accessCredentialIssue,
      entityType: 'access_credential',
      entityId: row.id,
      after: {
        memberId,
        credentialRef: row.credentialRef,
        provider: row.provider,
        status: row.status,
      },
    });

    return this.toDetail(row);
  }

  /**
   * Revoca la credencial ACTIVE del member (si existe).
   *
   * @throws {NotFoundException} Sin credencial ACTIVE.
   */
  async revoke(
    tenantId: string,
    memberId: string,
    actor: AuditActor,
  ): Promise<AccessCredentialDetail> {
    await this.requireMember(tenantId, memberId);
    const current = await this.prisma.accessCredential.findFirst({
      where: {
        tenantId,
        memberId,
        status: AccessCredentialStatus.ACTIVE,
      },
    });
    if (!current) {
      throw new NotFoundException('No active access credential for member');
    }

    const updated = await this.prisma.accessCredential.update({
      where: { id: current.id },
      data: {
        status: AccessCredentialStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    await this.identity.revokeCredential(current.credentialRef);

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.accessCredentialRevoke,
      entityType: 'access_credential',
      entityId: updated.id,
      before: { status: AccessCredentialStatus.ACTIVE },
      after: { status: AccessCredentialStatus.REVOKED },
    });

    return this.toDetail(updated);
  }

  /**
   * Resuelve presentación vía puerto (uso futuro de verify).
   */
  resolvePresentation(
    input: ResolvePresentationInput,
  ): Promise<ResolvedPresentation> {
    return this.identity.resolvePresentation(input);
  }

  private async requireMember(
    tenantId: string,
    memberId: string,
  ): Promise<{ id: string; status: MemberStatus }> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    return member;
  }

  private toDetail(row: AccessCredential): AccessCredentialDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      memberId: row.memberId,
      credentialRef: row.credentialRef,
      status: row.status,
      provider: row.provider,
      issuedAt: row.issuedAt,
      revokedAt: row.revokedAt,
      presentationToken: row.credentialRef,
      venueToken: this.identity.venueTokenForTenant(row.tenantId),
    };
  }
}
