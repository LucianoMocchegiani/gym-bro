import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleIdentityClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/**
 * Verifica `id_token` de Google Sign-In (audience = client IDs de la app).
 */
@Injectable()
export class GoogleIdTokenService {
  private readonly client = new OAuth2Client();
  private readonly audiences: string[];

  constructor(config: ConfigService) {
    this.audiences = (config.get<string>('GOOGLE_OAUTH_CLIENT_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  /**
   * @throws {ServiceUnavailableException} Sin client IDs configurados.
   * @throws {UnauthorizedException} Token inválido o email no verificado.
   */
  async verify(idToken: string): Promise<GoogleIdentityClaims> {
    if (this.audiences.length === 0) {
      throw new ServiceUnavailableException('Google login is not configured');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });
      const payload = ticket.getPayload();
      const sub = payload?.sub?.trim();
      const email = payload?.email?.trim().toLowerCase();
      if (!payload || !sub || !email) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (payload.email_verified !== true) {
        throw new UnauthorizedException('Google email is not verified');
      }
      return {
        sub,
        email,
        emailVerified: true,
        name: payload.name?.trim() || null,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
