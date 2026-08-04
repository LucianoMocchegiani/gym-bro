import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditEvent, Prisma } from '@prisma/client';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEventDetail, RecordAuditInput } from './audit.types';
import { ListAuditEventsQueryDto } from './dto/list-audit-events.dto';

type Tx = Prisma.TransactionClient;

/** Whitelist de orden para {@link AuditService.listByTenant}. */
const AUDIT_EVENT_ORDER_FIELDS = ['createdAt'] as const;

/**
 * Persistencia append-only de EventoAuditoria (RN-ROL-008 / CU-ROL-007).
 *
 * @remarks Emisión desde servicios de aplicación. Sin mutación ni borrado.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento. Fallos de escritura no deben silenciarse en callers
   * críticos: si el dominio ya commitió, el caller decide reintentar/log.
   */
  async record(input: RecordAuditInput): Promise<AuditEventDetail> {
    return this.recordWithClient(this.prisma, input);
  }

  /**
   * Misma escritura dentro de una transacción Prisma.
   */
  async recordInTx(tx: Tx, input: RecordAuditInput): Promise<AuditEventDetail> {
    return this.recordWithClient(tx, input);
  }

  /**
   * Lista eventos del tenant (paginado; más recientes primero por defecto).
   *
   * @throws {NotFoundException} Si el tenant no existe.
   */
  async listByTenant(
    tenantId: string,
    query: ListAuditEventsQueryDto = {},
  ): Promise<ListResult<AuditEventDetail>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      AUDIT_EVENT_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.AuditEventWhereInput = {
      tenantId,
      ...(query.action
        ? { action: query.action }
        : n.q
          ? { action: { contains: n.q, mode: 'insensitive' } }
          : {}),
    };
    const [events, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return toListResult(
      events.map((e) => this.toDetail(e)),
      total,
      n.page,
      n.pageSize,
    );
  }

  private async recordWithClient(
    client: Tx | PrismaService,
    input: RecordAuditInput,
  ): Promise<AuditEventDetail> {
    const event = await client.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorProfile: input.actor.profileType,
        actorId: input.actor.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before:
          input.before === undefined
            ? undefined
            : input.before === null
              ? Prisma.JsonNull
              : input.before,
        after:
          input.after === undefined
            ? undefined
            : input.after === null
              ? Prisma.JsonNull
              : input.after,
      },
    });
    return this.toDetail(event);
  }

  private toDetail(event: AuditEvent): AuditEventDetail {
    return {
      id: event.id,
      tenantId: event.tenantId,
      actorProfile: event.actorProfile,
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      before: event.before,
      after: event.after,
      createdAt: event.createdAt,
    };
  }
}
