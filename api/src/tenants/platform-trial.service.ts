import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformTrialEligibility } from './tenants.types';

/**
 * Candados del mes de prueba Faciliter: una vez por Identity y una vez por gym.
 *
 * @remarks Self-serve y Caja usan la misma evaluación. El débito MP al fin
 * de la prueba no está en este corte.
 */
@Injectable()
export class PlatformTrialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Si Caja (o el alta self-serve) puede otorgar 30 días $0 a este gym.
   */
  async evaluate(billingTenantId: string): Promise<PlatformTrialEligibility> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: billingTenantId },
      select: {
        id: true,
        slug: true,
        ownerIdentityId: true,
        platformTrialUsedAt: true,
        ownerIdentity: { select: { platformTrialUsedAt: true } },
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${billingTenantId} not found`);
    }
    if (tenant.slug === 'admin') {
      return {
        eligible: false,
        reason: 'El tenant de plataforma no contrata un plan Faciliter',
      };
    }
    if (tenant.platformTrialUsedAt) {
      return {
        eligible: false,
        reason: 'Este gym ya usó o agotó el mes de prueba',
      };
    }
    if (!tenant.ownerIdentityId || !tenant.ownerIdentity) {
      return {
        eligible: false,
        reason: 'El gym no tiene dueño (Identity) para consumir la prueba',
      };
    }
    if (tenant.ownerIdentity.platformTrialUsedAt) {
      return {
        eligible: false,
        reason: 'Esta cuenta ya usó el mes de prueba en otro gym',
      };
    }
    return { eligible: true, reason: null };
  }

  /**
   * Exige elegibilidad o lanza 400.
   *
   * @throws {BadRequestException} Candado de tenant o de cuenta.
   */
  async assertCanApplyTrial(billingTenantId: string): Promise<void> {
    const result = await this.evaluate(billingTenantId);
    if (!result.eligible) {
      throw new BadRequestException(result.reason ?? 'Trial is not available');
    }
  }
}
