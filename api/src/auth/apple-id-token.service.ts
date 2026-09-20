import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type AppleIdentityClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

const APPLE_ISSUER = 'https://appleid.apple.com';

/**
 * Verifica `id_token` de Sign in with Apple.
 *
 * @remarks Usa las claves públicas de Apple (`appleid.apple.com/auth/keys`)
 * para validar la firma, `iss`, `aud` y `exp`.
 */
@Injectable()
export class AppleIdTokenService {
  private readonly jwks = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );
  private readonly serviceId: string;
  private readonly teamId: string;

  constructor(config: ConfigService) {
    this.serviceId = config.getOrThrow<string>('APPLE_SERVICE_ID');
    this.teamId = config.getOrThrow<string>('APPLE_TEAM_ID');
  }

  /**
   * @throws {ServiceUnavailableException} Sin configuración de Apple.
   * @throws {UnauthorizedException} Token inválido, email no verificado o issuer/audience incorrectos.
   */
  async verify(idToken: string): Promise<AppleIdentityClaims> {
    if (!this.serviceId || !this.teamId) {
      throw new ServiceUnavailableException('Apple login is not configured');
    }
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: this.serviceId,
      });

      const sub = (payload.sub as string)?.trim();
      const email = (payload.email as string)?.trim().toLowerCase();
      if (!sub || !email) {
        throw new UnauthorizedException('Invalid Apple credentials');
      }
      if (payload.email_verified !== true) {
        throw new UnauthorizedException('Apple email is not verified');
      }

      const name = typeof payload.name === 'string' ? payload.name.trim() : null;

      return {
        sub,
        email,
        emailVerified: true,
        name,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Invalid Apple credentials');
    }
  }
}
