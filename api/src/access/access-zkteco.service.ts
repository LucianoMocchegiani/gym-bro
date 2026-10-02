import { ConflictException, Injectable } from '@nestjs/common';
import { AccessProvider } from '@prisma/client';
import { DoorActuatorPort } from '../access-providers/door-actuator.port';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { AccessVerifyService } from './access-verify.service';
import {
  ACCESS_CHANNEL,
  ACCESS_REASON,
  ACCESS_REASON_LABEL,
  AccessDoorConfig,
  AccessEntryOrigin,
  AccessReasonCode,
  AccessSubject,
  AccessVerifyResult,
  ZktecoEventResult,
} from './access.types';
import { ZktecoEventDto } from './dto/zkteco-event.dto';

/**
 * Referencia idempotente de un evento ZKTeco (serie + usuario + hora del aparato).
 */
export function zktecoCredentialRef(dto: ZktecoEventDto): string {
  const serial = dto.deviceSerial?.trim() || 'sin-serie';
  const at = new Date(dto.occurredAt).toISOString();
  return `zkteco:${serial}:${dto.userId}:${at}`;
}

/**
 * Adapter de puerta ZKTeco: número de usuario del aparato → socio/staff → reglas.
 *
 * @remarks No envía nada a Kuatia. Identidad: vínculo (`access_identity_links`)
 * y, si no hay, `members.document` = número de usuario (RN-ACC-011). Las reglas
 * son las mismas que con Kuatia (`AccessVerifyService.evaluateSubject`). Tras un
 * allow pide abrir al {@link DoorActuatorPort}.
 */
@Injectable()
export class AccessZktecoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly accessVerify: AccessVerifyService,
    private readonly door: DoorActuatorPort,
  ) {}

  /**
   * Sistema de puerta configurado en el gym.
   */
  async getDoorConfig(tenantId: string): Promise<AccessDoorConfig> {
    return { provider: await this.tenantSettings.getAccessProvider(tenantId) };
  }

  /**
   * Procesa un evento del aparato y responde si hay que abrir.
   *
   * @param tenantId - Del contexto autenticado (nunca del evento).
   * @param actorStaffId - Staff con el que se autentica el puente.
   * @throws {ConflictException} Si el gym no usa ZKTeco como sistema de puerta.
   */
  async handleEvent(
    tenantId: string,
    dto: ZktecoEventDto,
    actorStaffId: string | null,
  ): Promise<ZktecoEventResult> {
    const provider = await this.tenantSettings.getAccessProvider(tenantId);
    if (provider !== AccessProvider.ZKTECO) {
      throw new ConflictException(
        'Este gym no usa acceso ZKTeco (RN-ACC-010).',
      );
    }

    const credentialRef = zktecoCredentialRef(dto);
    const existing = await this.findAttemptResult(tenantId, credentialRef);
    if (existing) {
      return this.toEventResult(existing, { open: false, duplicate: true });
    }

    const origin: AccessEntryOrigin = {
      tenantId,
      channel: ACCESS_CHANNEL.zkteco,
      scanMode: 'member_at_device',
      credentialRef,
      actorStaffId,
    };

    const subject = await this.resolveSubject(tenantId, dto.userId);
    const result = subject
      ? await this.accessVerify.evaluateSubject(subject, origin)
      : await this.accessVerify.persistIdentityDenied({
          origin,
          memberId: null,
          subjectStaffId: null,
          reasonCode: ACCESS_REASON.sinVinculo,
        });

    let open = false;
    if (result.allowed) {
      open = await this.door.open({
        tenantId,
        provider: AccessProvider.ZKTECO,
        deviceSerial: dto.deviceSerial?.trim() || null,
        accessAttemptId: result.attempt.id,
      });
    }
    return this.toEventResult(result, { open, duplicate: false });
  }

  /**
   * Vínculo del aparato primero; si no hay, socio con ese DNI en el gym.
   */
  private async resolveSubject(
    tenantId: string,
    externalId: string,
  ): Promise<AccessSubject | null> {
    const link = await this.prisma.accessIdentityLink.findUnique({
      where: {
        tenantId_provider_externalId: {
          tenantId,
          provider: AccessProvider.ZKTECO,
          externalId,
        },
      },
      select: { memberId: true, staffUserId: true },
    });
    if (link?.staffUserId) {
      return { kind: 'staff', staffUserId: link.staffUserId };
    }
    if (link?.memberId) {
      return { kind: 'member', memberId: link.memberId };
    }

    const byDocument = await this.prisma.member.findFirst({
      where: { tenantId, document: externalId },
      select: { id: true },
    });
    return byDocument ? { kind: 'member', memberId: byDocument.id } : null;
  }

  private async findAttemptResult(
    tenantId: string,
    credentialRef: string,
  ): Promise<AccessVerifyResult | null> {
    const row = await this.prisma.accessAttempt.findFirst({
      where: { tenantId, credentialRef },
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { name: true, email: true } },
        subjectStaff: { select: { name: true, email: true } },
      },
    });
    if (!row) {
      return null;
    }
    return this.accessVerify.toVerifyResultFromAttempt(
      row,
      row.member,
      row.subjectStaff,
    );
  }

  private toEventResult(
    result: AccessVerifyResult,
    flags: { open: boolean; duplicate: boolean },
  ): ZktecoEventResult {
    const reasonCode = result.reasonCode as AccessReasonCode;
    return {
      allowed: result.allowed,
      reasonCode: result.reasonCode,
      reasonLabel: ACCESS_REASON_LABEL[reasonCode] ?? result.reasonCode,
      open: flags.open,
      duplicate: flags.duplicate,
      result,
    };
  }
}
