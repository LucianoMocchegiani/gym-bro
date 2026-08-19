import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CredentialOfferStatus,
  Prisma,
  StaffCredentialOffer,
} from '@prisma/client';
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { KuatiaHttpError } from './http-kuatia-admin.adapter';
import { KuatiaAdminPort } from './kuatia-admin.port';
import { KuatiaEnvService } from './kuatia-env.service';
import {
  KuatiaStaffSyncService,
  staffKuatiaIds,
} from './kuatia-staff-sync.service';

const MAX_ERROR_LEN = 500;

/**
 * Item de listado de credential offers de staff (molinete).
 */
export type StaffCredentialOfferListItem = {
  id: string;
  status: CredentialOfferStatus;
  staffUserId: string;
  staffName: string | null;
  staffEmail: string;
  offerUri: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Emite y lista offers OID4VCI de acceso staff (soft-fail Kuatia).
 *
 * @remarks Claims: `staffId`, `staffName`, `tenantId` (roles solo en DB al verify).
 * Sin fichaje en este slice.
 */
@Injectable()
export class KuatiaStaffOfferService {
  private readonly logger = new Logger(KuatiaStaffOfferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kuatia: KuatiaAdminPort,
    private readonly kuatiaEnv: KuatiaEnvService,
    private readonly staffSync: KuatiaStaffSyncService,
  ) {}

  /**
   * Asegura offer para un staff (1:1 por `staffUserId`).
   *
   * @param options.force - Re-emite aunque haya PENDING/ACCEPTED con URI.
   */
  async ensureOfferForStaff(
    tenantId: string,
    staffUserId: string,
    options?: { force?: boolean },
  ): Promise<StaffCredentialOfferListItem> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!staff) {
      throw new NotFoundException(`Staff ${staffUserId} not found`);
    }

    const existing = await this.prisma.staffCredentialOffer.findUnique({
      where: { staffUserId },
    });
    if (
      !options?.force &&
      existing?.status === CredentialOfferStatus.PENDING &&
      existing.offerUri
    ) {
      return this.toListItem(existing, staff);
    }
    if (
      !options?.force &&
      existing?.status === CredentialOfferStatus.ACCEPTED &&
      existing.offerUri
    ) {
      return this.toListItem(existing, staff);
    }

    await this.staffSync.syncStaffConfiguration(tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const { configurationId, vct } = staffKuatiaIds(tenantId);
    const staffName = staff.name?.trim() || staff.email;
    const claims = {
      staffId: staff.id,
      staffName,
      tenantId,
      tenantName: tenant?.name ?? tenantId,
    };

    let issuerWalletId: string;
    try {
      issuerWalletId = this.kuatiaEnv.requireSharedIssuerWalletId();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        staffUserId,
        staff,
        status: CredentialOfferStatus.FAILED,
        offerUri: null,
        lastError: msg,
      });
    }

    try {
      const created = await this.kuatia.createCredentialOffer(issuerWalletId, {
        credentialConfigurationId: configurationId,
        vct,
        claims,
        claimsDisplay: {
          staffId: { name: 'Staff ID', locale: 'es' },
          staffName: { name: 'Nombre', locale: 'es' },
          tenantId: { name: 'Gym ID', locale: 'es' },
          tenantName: { name: 'Gym', locale: 'es' },
        },
        disclosureFrame: {
          _sd: ['staffId', 'staffName', 'tenantId', 'tenantName'],
        },
      });
      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        staffUserId,
        staff,
        status: CredentialOfferStatus.PENDING,
        offerUri: created.offerUri,
        lastError: null,
      });
    } catch (err) {
      const message = this.formatError(err);
      this.logger.warn(
        `Staff offer failed tenant=${tenantId} staff=${staffUserId}: ${message}`,
      );
      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        staffUserId,
        staff,
        status: CredentialOfferStatus.FAILED,
        offerUri: null,
        lastError: message,
      });
    }
  }

  /**
   * Lista offers de un staff (paginado).
   */
  async listForStaff(
    tenantId: string,
    staffUserId: string,
    query: ListQueryDto = {},
  ): Promise<ListResult<StaffCredentialOfferListItem>> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
      select: { id: true, name: true, email: true },
    });
    if (!staff) {
      throw new NotFoundException(`Staff ${staffUserId} not found`);
    }
    const n = normalizeListQuery(query);
    const where: Prisma.StaffCredentialOfferWhereInput = {
      tenantId,
      staffUserId,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.staffCredentialOffer.findMany({
        where,
        orderBy: { createdAt: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.staffCredentialOffer.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toListItem(r, staff)),
      total,
      n.page,
      n.pageSize,
    );
  }

  private async persistOffer(input: {
    existingId?: string;
    tenantId: string;
    staffUserId: string;
    staff: { id: string; name: string | null; email: string };
    status: CredentialOfferStatus;
    offerUri: string | null;
    lastError: string | null;
  }): Promise<StaffCredentialOfferListItem> {
    const data = {
      tenantId: input.tenantId,
      staffUserId: input.staffUserId,
      status: input.status,
      offerUri: input.offerUri,
      lastError: input.lastError
        ? input.lastError.slice(0, MAX_ERROR_LEN)
        : null,
    };
    const row = input.existingId
      ? await this.prisma.staffCredentialOffer.update({
          where: { id: input.existingId },
          data,
        })
      : await this.prisma.staffCredentialOffer.create({ data });
    return this.toListItem(row, input.staff);
  }

  private toListItem(
    row: StaffCredentialOffer,
    staff: { id: string; name: string | null; email: string },
  ): StaffCredentialOfferListItem {
    return {
      id: row.id,
      status: row.status,
      staffUserId: row.staffUserId,
      staffName: staff.name,
      staffEmail: staff.email,
      offerUri: row.offerUri,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private formatError(err: unknown): string {
    if (err instanceof KuatiaHttpError) {
      return `Kuatia ${err.status}: ${err.message}`.slice(0, MAX_ERROR_LEN);
    }
    return (err instanceof Error ? err.message : String(err)).slice(
      0,
      MAX_ERROR_LEN,
    );
  }
}
