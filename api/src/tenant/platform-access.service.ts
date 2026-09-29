import { Injectable } from '@nestjs/common';
import { ContractStatus, ContractType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLATFORM_ACCESS_GRACE_DAYS,
  PLATFORM_UNLIMITED_TENANT_IDS,
  addCalendarDays,
} from '../tenants/platform-trial';
import type { PlatformAccessState } from './platform-access.types';

/**
 * Si el gym puede operar o solo renovar el plan Faciliter.
 *
 * @remarks Allowlist por id (demo + `admin`). El resto: sin `TENANT` vigente
 * y pasados 3 días desde `endsAt` o, si nunca hubo plan, desde el alta.
 * Impersonación no se evalúa acá (el guard la saltea).
 */
@Injectable()
export class PlatformAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `ok` = operación normal. `limited` = solo Plan / cuenta.
   */
  async evaluate(tenantId: string): Promise<PlatformAccessState> {
    if (PLATFORM_UNLIMITED_TENANT_IDS.has(tenantId)) {
      return 'ok';
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { createdAt: true },
    });
    if (!tenant) {
      return 'limited';
    }

    const now = new Date();
    const live = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractType: ContractType.TENANT,
        status: ContractStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (live) {
      return 'ok';
    }

    const last = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractType: ContractType.TENANT,
      },
      orderBy: { endsAt: 'desc' },
      select: { endsAt: true, startsAt: true },
    });
    const anchor = last?.endsAt ?? last?.startsAt ?? tenant.createdAt;
    const graceEnds = addCalendarDays(anchor, PLATFORM_ACCESS_GRACE_DAYS);
    return now.getTime() <= graceEnds.getTime() ? 'ok' : 'limited';
  }
}
