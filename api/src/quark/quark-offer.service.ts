import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CredentialOffer,
  CredentialOfferStatus,
  QuarkProvisionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkHttpError } from './http-quark-admin.adapter';
import { QuarkAdminPort } from './quark-admin.port';
import { packQuarkIds } from './quark-pack-sync.service';

const MAX_ERROR_LEN = 500;

/**
 * Item de bandeja / listado de credential offers (respuesta API slim).
 */
export type CredentialOfferListItem = {
  id: string;
  status: CredentialOfferStatus;
  packId: string;
  packName: string;
  contractId: string;
  offerUri: string | null;
  validFrom: string;
  validUntil: string | null;
  createdAt: Date;
  /** Solo en listado staff (ops / soft-fail). */
  lastError?: string | null;
};

/**
 * Crea y lista credential offers OID4VCI tras contratación pack (soft-fail).
 *
 * @remarks No persiste claims ni config Quark: al (re)emitir se reconstruyen
 * desde el contrato (`ensureOfferForContract`).
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
@Injectable()
export class QuarkOfferService {
  private readonly logger = new Logger(QuarkOfferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quark: QuarkAdminPort,
  ) {}

  /**
   * Asegura un offer para el contrato (idempotente por `contractId`).
   *
   * @remarks Si ya hay PENDING con URI y no es `force`, lo reutiliza. Si FAILED
   * o `force`, reintenta Quark reconstruyendo claims desde el contrato.
   * Nunca lanza por fallo Quark.
   *
   * @param options.force - Staff re-oferta: ignora PENDING previo (Credo puede
   *   haber perdido la sesión tras restart / cambio de BASE_URL).
   */
  async ensureOfferForContract(
    tenantId: string,
    contractId: string,
    options?: { force?: boolean },
  ): Promise<CredentialOfferListItem> {
    const existing = await this.prisma.credentialOffer.findUnique({
      where: { contractId },
      include: {
        pack: { select: { name: true } },
        contract: { select: { startsAt: true, endsAt: true } },
      },
    });
    if (
      !options?.force &&
      existing?.status === CredentialOfferStatus.PENDING &&
      existing.offerUri
    ) {
      return this.toListItem(existing, existing.pack.name, existing.contract, {
        includeLastError: true,
      });
    }

    const ctx = await this.loadContractContext(tenantId, contractId);
    if (!ctx) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const { configurationId, vct } = packQuarkIds(ctx.packId);
    const claims = this.buildClaims(tenantId, ctx);
    const claimsDisplay = this.buildClaimsDisplay();

    if (
      ctx.quarkStatus !== QuarkProvisionStatus.READY ||
      !ctx.issuerWalletId
    ) {
      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        memberId: ctx.memberId,
        packId: ctx.packId,
        packName: ctx.packName,
        contractId,
        startsAt: ctx.startsAt,
        endsAt: ctx.endsAt,
        status: CredentialOfferStatus.FAILED,
        offerUri: null,
        lastError: `Tenant Quark not READY (status=${ctx.quarkStatus})`,
      });
    }

    try {
      const created = await this.quark.createCredentialOffer(
        ctx.issuerWalletId,
        {
          credentialConfigurationId: configurationId,
          vct,
          claims,
          claimsDisplay,
          disclosureFrame: {
            _sd: [
              'memberId',
              'memberName',
              'tenantId',
              'tenantName',
              'packId',
              'packName',
              'validFrom',
              'validUntil',
            ],
          },
        },
      );

      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        memberId: ctx.memberId,
        packId: ctx.packId,
        packName: ctx.packName,
        contractId,
        startsAt: ctx.startsAt,
        endsAt: ctx.endsAt,
        status: CredentialOfferStatus.PENDING,
        offerUri: created.offerUri,
        lastError: null,
      });
    } catch (err) {
      const message = this.formatError(err);
      this.logger.warn(
        `Quark offer failed tenant=${tenantId} contract=${contractId}: ${message}`,
      );
      return this.persistOffer({
        existingId: existing?.id,
        tenantId,
        memberId: ctx.memberId,
        packId: ctx.packId,
        packName: ctx.packName,
        contractId,
        startsAt: ctx.startsAt,
        endsAt: ctx.endsAt,
        status: CredentialOfferStatus.FAILED,
        offerUri: null,
        lastError: message,
      });
    }
  }

  /**
   * Lista offers del afiliado (más recientes primero).
   *
   * @param options.includeLastError - true para staff (ops).
   */
  async listForMember(
    tenantId: string,
    memberId: string,
    options?: { includeLastError?: boolean },
  ): Promise<CredentialOfferListItem[]> {
    const rows = await this.prisma.credentialOffer.findMany({
      where: { tenantId, memberId },
      include: {
        pack: { select: { name: true } },
        contract: { select: { startsAt: true, endsAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) =>
      this.toListItem(r, r.pack.name, r.contract, {
        includeLastError: options?.includeLastError === true,
      }),
    );
  }

  /**
   * Marca un offer como `ACCEPTED` tras OID4VCI exitoso en la wallet del afiliado.
   *
   * @remarks Idempotente si ya está `ACCEPTED`. Conserva `offerUri` (auditoría).
   * Solo el dueño (`memberId`) puede aceptar. Tenant desde auth.
   * @throws {NotFoundException} Si no existe para el member/tenant.
   * @throws {BadRequestException} Si el status no es `PENDING` ni `ACCEPTED`.
   */
  async markAcceptedByMember(
    tenantId: string,
    memberId: string,
    offerId: string,
  ): Promise<CredentialOfferListItem> {
    const row = await this.prisma.credentialOffer.findFirst({
      where: { id: offerId, tenantId, memberId },
      include: {
        pack: { select: { name: true } },
        contract: { select: { startsAt: true, endsAt: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Credential offer ${offerId} not found`);
    }
    if (row.status === CredentialOfferStatus.ACCEPTED) {
      return this.toListItem(row, row.pack.name, row.contract, {
        includeLastError: false,
      });
    }
    if (row.status !== CredentialOfferStatus.PENDING) {
      throw new BadRequestException(
        `Credential offer ${offerId} cannot be accepted (status=${row.status})`,
      );
    }

    const updated = await this.prisma.credentialOffer.update({
      where: { id: row.id },
      data: {
        status: CredentialOfferStatus.ACCEPTED,
        lastError: null,
      },
      include: {
        pack: { select: { name: true } },
        contract: { select: { startsAt: true, endsAt: true } },
      },
    });
    return this.toListItem(updated, updated.pack.name, updated.contract, {
      includeLastError: false,
    });
  }

  private async loadContractContext(
    tenantId: string,
    contractId: string,
  ): Promise<{
    memberId: string;
    memberName: string | null;
    packId: string;
    packName: string;
    startsAt: Date;
    endsAt: Date | null;
    tenantName: string;
    quarkStatus: QuarkProvisionStatus;
    issuerWalletId: string | null;
  } | null> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      select: {
        memberId: true,
        packId: true,
        startsAt: true,
        endsAt: true,
        member: { select: { name: true } },
        pack: { select: { name: true } },
        tenant: {
          select: {
            name: true,
            quarkStatus: true,
            quarkIssuerWalletId: true,
          },
        },
      },
    });
    if (!contract) {
      return null;
    }
    return {
      memberId: contract.memberId,
      memberName: contract.member.name,
      packId: contract.packId,
      packName: contract.pack.name,
      startsAt: contract.startsAt,
      endsAt: contract.endsAt,
      tenantName: contract.tenant.name,
      quarkStatus: contract.tenant.quarkStatus,
      issuerWalletId: contract.tenant.quarkIssuerWalletId,
    };
  }

  private buildClaims(
    tenantId: string,
    ctx: {
      memberId: string;
      memberName: string | null;
      packId: string;
      packName: string;
      tenantName: string;
      startsAt: Date;
      endsAt: Date | null;
    },
  ): Record<string, unknown> {
    return {
      memberId: ctx.memberId,
      memberName: ctx.memberName ?? '',
      tenantId,
      tenantName: ctx.tenantName,
      packId: ctx.packId,
      packName: ctx.packName,
      validFrom: ctx.startsAt.toISOString(),
      validUntil: ctx.endsAt?.toISOString() ?? null,
    };
  }

  private buildClaimsDisplay(): Record<
    string,
    { name: string; locale?: string }
  > {
    return {
      memberId: { name: 'ID afiliado', locale: 'es' },
      memberName: { name: 'Afiliado', locale: 'es' },
      tenantId: { name: 'ID gym', locale: 'es' },
      tenantName: { name: 'Gimnasio', locale: 'es' },
      packId: { name: 'ID pack', locale: 'es' },
      packName: { name: 'Pack', locale: 'es' },
      validFrom: { name: 'Válido desde', locale: 'es' },
      validUntil: { name: 'Válido hasta', locale: 'es' },
    };
  }

  private async persistOffer(input: {
    existingId?: string;
    tenantId: string;
    memberId: string;
    packId: string;
    packName: string;
    contractId: string;
    startsAt: Date;
    endsAt: Date | null;
    status: CredentialOfferStatus;
    offerUri: string | null;
    lastError: string | null;
  }): Promise<CredentialOfferListItem> {
    const lastError = input.lastError
      ? input.lastError.slice(0, MAX_ERROR_LEN)
      : null;
    const data = {
      tenantId: input.tenantId,
      memberId: input.memberId,
      packId: input.packId,
      contractId: input.contractId,
      status: input.status,
      offerUri: input.offerUri,
      lastError,
    };

    const row = input.existingId
      ? await this.prisma.credentialOffer.update({
          where: { id: input.existingId },
          data,
        })
      : await this.prisma.credentialOffer.upsert({
          where: { contractId: input.contractId },
          create: data,
          update: data,
        });

    return this.toListItem(
      row,
      input.packName,
      { startsAt: input.startsAt, endsAt: input.endsAt },
      { includeLastError: true },
    );
  }

  private toListItem(
    row: CredentialOffer,
    packName: string,
    contract: { startsAt: Date; endsAt: Date | null },
    options: { includeLastError: boolean },
  ): CredentialOfferListItem {
    const item: CredentialOfferListItem = {
      id: row.id,
      status: row.status,
      packId: row.packId,
      packName,
      contractId: row.contractId,
      offerUri: row.offerUri,
      validFrom: contract.startsAt.toISOString(),
      validUntil: contract.endsAt?.toISOString() ?? null,
      createdAt: row.createdAt,
    };
    if (options.includeLastError) {
      item.lastError = row.lastError;
    }
    return item;
  }

  private formatError(err: unknown): string {
    if (err instanceof QuarkHttpError) {
      const snippet = err.body ? ` ${err.body.slice(0, 200)}` : '';
      return `${err.message}${snippet}`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
