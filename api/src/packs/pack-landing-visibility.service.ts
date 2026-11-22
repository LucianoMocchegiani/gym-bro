import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackLandingVisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(tenantId: string, packId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ showOnLanding: boolean }[]>`
      SELECT show_on_landing AS "showOnLanding"
      FROM packs
      WHERE id = ${packId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND origin_service_id IS NULL
    `;
    if (!rows[0]) {
      throw new NotFoundException(`Pack ${packId} not found in tenant`);
    }
    return rows[0].showOnLanding;
  }

  async update(
    tenantId: string,
    packId: string,
    showOnLanding: boolean,
    actor: AuditActor,
  ): Promise<boolean> {
    const before = await this.get(tenantId, packId);
    const rows = await this.prisma.$queryRaw<{ showOnLanding: boolean }[]>`
      UPDATE packs
      SET show_on_landing = ${showOnLanding}, updated_at = NOW()
      WHERE id = ${packId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND origin_service_id IS NULL
      RETURNING show_on_landing AS "showOnLanding"
    `;
    if (!rows[0]) {
      throw new BadRequestException('Drop-in packs cannot be published');
    }
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.packUpdate,
      entityType: 'pack',
      entityId: packId,
      before: { showOnLanding: before },
      after: { showOnLanding: rows[0].showOnLanding },
    });
    return rows[0].showOnLanding;
  }

  async visiblePackIds(tenantId: string): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id
      FROM packs
      WHERE tenant_id = ${tenantId}::uuid AND show_on_landing = true
    `;
    return new Set(rows.map(({ id }) => id));
  }

  async visiblePlatformPackIds(): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id::text AS id
      FROM packs p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE t.slug = 'admin' AND p.show_on_landing = true
    `;
    return new Set(rows.map(({ id }) => id));
  }
}
