import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEventDetail, RecordAuditInput } from './audit.types';

type Tx = Prisma.TransactionClient;

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
   * Lista eventos del tenant (más recientes primero).
   *
   * @throws {NotFoundException} Si el tenant no existe.
   */
  async listByTenant(
    tenantId: string,
    options: { limit?: number; action?: string } = {},
  ): Promise<AuditEventDetail[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const limit = options.limit ?? 50;
    const events = await this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        ...(options.action ? { action: options.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return events.map((e) => this.toDetail(e));
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
