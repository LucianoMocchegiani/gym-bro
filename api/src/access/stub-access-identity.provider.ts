import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessCredentialStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessIdentityProvider,
  IssueMembershipCredentialInput,
  ResolvePresentationInput,
  ResolvedPresentation,
} from './access-identity.port';

/**
 * Adapter stub de identidad de acceso (sin Quark/SSI real).
 *
 * @remarks `ACCESS_PROVIDER=stub`. `credentialRef` = `stub:{uuid}`.
 * Venue = `stub-venue:{tenantId}`. Resolve consulta `access_credentials` ACTIVE.
 */
@Injectable()
export class StubAccessIdentityProvider extends AccessIdentityProvider {
  readonly providerId = 'stub';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  venueTokenForTenant(tenantId: string): string {
    return `stub-venue:${tenantId}`;
  }

  async issueMembershipCredential(
    _input: IssueMembershipCredentialInput,
  ): Promise<{ credentialRef: string; provider: string }> {
    return {
      credentialRef: `stub:${randomUUID()}`,
      provider: this.providerId,
    };
  }

  async revokeCredential(_credentialRef: string): Promise<void> {
    // Stub: la fuente de verdad del status es la DB local.
  }

  /**
   * Resuelve presentación contra credenciales ACTIVE en DB.
   *
   * @throws {BadRequestException} Payload incompleto o mode inválido.
   * @throws {UnauthorizedException} Credencial desconocida, revocada o venue incorrecto.
   */
  async resolvePresentation(
    input: ResolvePresentationInput,
  ): Promise<ResolvedPresentation> {
    if (input.mode === 'gym_scans_member') {
      const ref = input.presentationToken?.trim();
      if (!ref) {
        throw new BadRequestException('presentationToken is required');
      }
      return this.resolveActiveRef(ref);
    }

    if (input.mode === 'member_scans_gym') {
      const venue = input.venueToken?.trim();
      const ref =
        input.credentialRef?.trim() ?? input.presentationToken?.trim();
      if (!venue || !ref) {
        throw new BadRequestException(
          'venueToken and credentialRef (or presentationToken) are required',
        );
      }
      const resolved = await this.resolveActiveRef(ref);
      const expected = this.venueTokenForTenant(resolved.tenantId);
      if (venue !== expected) {
        throw new UnauthorizedException('Invalid venue token');
      }
      return resolved;
    }

    throw new BadRequestException(
      `Unsupported scan mode: ${String(input.mode)}`,
    );
  }

  private async resolveActiveRef(
    credentialRef: string,
  ): Promise<ResolvedPresentation> {
    const row = await this.prisma.accessCredential.findUnique({
      where: { credentialRef },
      select: {
        tenantId: true,
        memberId: true,
        credentialRef: true,
        status: true,
      },
    });
    if (!row || row.status !== AccessCredentialStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or revoked credential');
    }
    return {
      tenantId: row.tenantId,
      afiliadoId: row.memberId,
      credentialRef: row.credentialRef,
    };
  }
}
