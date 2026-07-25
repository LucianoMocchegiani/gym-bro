import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Member, MemberStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { ContractsService } from '../contracts/contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/member.dto';
import { MemberAccountDetail, MemberDetail } from './members.types';

/** Cantidad de pagos recientes en estado de cuenta. */
const RECENT_PAYMENTS_LIMIT = 20;

/**
 * CRUD de afiliados y estado de cuenta (CU-AFI-001..005).
 *
 * @remarks Credencial SSI diferida (E6). Login solo si status ACTIVE.
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Lista afiliados del tenant (más recientes primero).
   */
  async list(
    tenantId: string,
    options: { status?: MemberStatus } = {},
  ): Promise<MemberDetail[]> {
    await this.assertTenantExists(tenantId);
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        ...(options.status ? { status: options.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return members.map((m) => this.toDetail(m));
  }

  /**
   * Detalle de un afiliado del tenant.
   */
  async findOne(tenantId: string, memberId: string): Promise<MemberDetail> {
    const member = await this.findInTenant(tenantId, memberId);
    return this.toDetail(member);
  }

  /**
   * Estado de cuenta: ficha + contratos + pagos + placeholders deuda/reservas.
   *
   * @remarks CU-AFI-004 / CU-AFI-005. `debt` siempre AL_DIA hasta E5.
   * Contratos ACTIVE primero; filtro opcional por status de contrato.
   */
  async getAccount(
    tenantId: string,
    memberId: string,
    options: { contractStatus?: ContractStatus } = {},
  ): Promise<MemberAccountDetail> {
    const member = await this.findInTenant(tenantId, memberId);
    const allContracts = await this.contractsService.listByMember(
      tenantId,
      memberId,
    );
    const active = allContracts.filter((c) => c.status === 'ACTIVE');
    const totalCreditsRemaining = active.reduce(
      (sum, c) => sum + c.creditBalances.reduce((s, b) => s + b.remaining, 0),
      0,
    );

    let contracts = allContracts;
    if (options.contractStatus) {
      contracts = allContracts.filter(
        (c) => c.status === options.contractStatus,
      );
    } else {
      contracts = [...allContracts].sort((a, b) => {
        const rank = (s: string) => (s === 'ACTIVE' ? 0 : 1);
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) {
          return byStatus;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_PAYMENTS_LIMIT,
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        packId: true,
        createdAt: true,
      },
    });

    return {
      member: this.toDetail(member),
      summary: {
        activeContracts: active.length,
        hasAccessLibre: active.some((c) => c.hasAccessLibre),
        totalCreditsRemaining,
      },
      debt: { amount: 0, status: 'AL_DIA' },
      contracts,
      recentPayments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.method,
        packId: p.packId,
        createdAt: p.createdAt,
      })),
      reservations: [],
    };
  }

  /**
   * Alta de afiliado activo con password inicial.
   */
  async create(
    tenantId: string,
    dto: CreateMemberDto,
    actor: AuditActor,
  ): Promise<MemberDetail> {
    await this.assertTenantExists(tenantId);
    const email = dto.email.trim().toLowerCase();
    const document = this.normalizeOptional(dto.document);
    const phone = this.normalizeOptional(dto.phone);
    const branchId = dto.branchId ?? null;

    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const member = await this.prisma.member.create({
        data: {
          tenantId,
          email,
          passwordHash,
          name: dto.name.trim(),
          phone,
          document,
          branchId,
          status: MemberStatus.ACTIVE,
        },
      });
      const detail = this.toDetail(member);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.memberCreate,
        entityType: 'member',
        entityId: member.id,
        before: null,
        after: this.auditSnapshot(detail),
      });
      return detail;
    } catch (error: unknown) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  /**
   * Edita ficha (sin status ni password).
   */
  async update(
    tenantId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actor: AuditActor,
  ): Promise<MemberDetail> {
    if (
      dto.email === undefined &&
      dto.name === undefined &&
      dto.phone === undefined &&
      dto.document === undefined &&
      dto.branchId === undefined
    ) {
      throw new BadRequestException(
        'Provide email, name, phone, document and/or branchId',
      );
    }

    const before = await this.findInTenant(tenantId, memberId);
    const data: Prisma.MemberUpdateInput = {};

    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = this.normalizeOptional(dto.phone);
    }
    if (dto.document !== undefined) {
      data.document = this.normalizeOptional(dto.document);
    }
    if (dto.branchId !== undefined) {
      if (dto.branchId === null) {
        data.branch = { disconnect: true };
      } else {
        await this.assertBranchInTenant(tenantId, dto.branchId);
        data.branch = { connect: { id: dto.branchId } };
      }
    }

    try {
      const member = await this.prisma.member.update({
        where: { id: memberId },
        data,
      });
      const detail = this.toDetail(member);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.memberUpdate,
        entityType: 'member',
        entityId: memberId,
        before: this.auditSnapshot(this.toDetail(before)),
        after: this.auditSnapshot(detail),
      });
      return detail;
    } catch (error: unknown) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  /**
   * Cambia status (ACTIVE / SUSPENDED / INACTIVE). Requiere flag peligroso.
   */
  async updateStatus(
    tenantId: string,
    memberId: string,
    dto: UpdateMemberStatusDto,
    actor: AuditActor,
  ): Promise<MemberDetail> {
    const before = await this.findInTenant(tenantId, memberId);
    if (before.status === dto.status) {
      return this.toDetail(before);
    }

    const member = await this.prisma.member.update({
      where: { id: memberId },
      data: { status: dto.status },
    });
    const detail = this.toDetail(member);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.memberStatus,
      entityType: 'member',
      entityId: memberId,
      before: { status: before.status },
      after: { status: detail.status },
    });
    return detail;
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
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
      throw new BadRequestException(
        `Branch ${branchId} does not belong to this tenant`,
      );
    }
  }

  private async findInTenant(
    tenantId: string,
    memberId: string,
  ): Promise<Member> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    return member;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toDetail(member: Member): MemberDetail {
    return {
      id: member.id,
      tenantId: member.tenantId,
      email: member.email,
      name: member.name,
      phone: member.phone,
      document: member.document,
      branchId: member.branchId,
      status: member.status,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private auditSnapshot(detail: MemberDetail): Prisma.InputJsonValue {
    return {
      email: detail.email,
      name: detail.name,
      phone: detail.phone,
      document: detail.document,
      branchId: detail.branchId,
      status: detail.status,
    };
  }

  private rethrowUniqueConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Member email or document already exists in tenant',
      );
    }
  }
}
